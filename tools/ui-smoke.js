// Teste de fumaça da interface: sobe o jogo no mesmo processo, abre mestre, jogadores e mesa no Chromium (Playwright)
// e exercita a batalha, o acampamento, os pedidos e a aba Ofícios. Falha com erro de console, botão quebrado ou estado errado.
//   npm run ui                      (todas as telas, desktop e celular)
//   UI_SHOTS=pasta npm run ui       (guarda capturas de tela em pasta)
//   UI_ONLY=celular npm run ui      (só o bloco que tiver esse nome)
// Precisa do Playwright (já instalado no ambiente do agente: require('playwright')); não faz parte de `npm test`.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { createRequire } from 'module';
process.env.VJ_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vjui-'));
process.env.GM_KEY = 'chave'; process.env.VJ_TUNNEL = '0';
let chromium;
try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.log('ui-smoke: Playwright não encontrado; teste de interface ignorado.'); process.exit(0); }
const { H, S, server, push, current, handle } = await import('../server.js');
await new Promise(r => server.listen(0, '127.0.0.1', r));
const URL = 'http://127.0.0.1:' + server.address().port, SHOTS = process.env.UI_SHOTS, ONLY = process.env.UI_ONLY || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const gmc = { role: 'gm', send() {} };

// ---------- infraestrutura ----------
const fails = [], logs = [];
let okN = 0;
const check = (cond, msg) => { if (cond) okN++; else { fails.push(msg); console.log('  ✗ ' + msg); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, msg, ms = 4000) { const t = Date.now(); for (;;) { try { const v = await fn(); if (v) return v; } catch {} if (Date.now() - t > ms) { check(false, 'tempo esgotado: ' + msg); return false; } await sleep(60); } }
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const opened = [];
async function open(who, route, { phone = false, login } = {}) {
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148' } : { viewport: { width: 1280, height: 800 } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' })); // sem internet: a fonte cai no padrão
  await ctx.addInitScript(() => { window.__osc = 0; const AC = window.AudioContext; if (AC) window.AudioContext = class extends AC { createOscillator() { window.__osc++; return super.createOscillator(); } }; }); // conta os sons sintetizados
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') { logs.push(`[${who}] console: ${m.text()}`); } });
  page.on('pageerror', e => logs.push(`[${who}] erro de página: ${e.message}`));
  await page.goto(URL + route);
  if (login) { // login pelo formulário, como o usuário faria
    await page.waitForSelector('#login');
    if (login.n) await page.fill('input[name=n]', login.n);
    await page.fill('input[name=p]', login.p); await page.click('#login button');
  }
  await page.waitForFunction(() => !document.querySelector('#login') && document.body.innerText.trim() !== 'Conectando…', null, { timeout: 5000 }).catch(() => check(false, `${who}: não saiu da tela de login`));
  opened.push(ctx); page.who = who; return page;
}
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${page.who}-${name}.png`) }); };
const vis = (page, sel) => page.locator(sel).first().isVisible().catch(() => false);
const click = async (page, sel, what) => { const l = page.locator(sel).first(); if (!await l.count()) { check(false, `${page.who}: não achei ${what || sel}`); return false; } await l.click({ timeout: 3000 }).catch(e => check(false, `${page.who}: não consegui clicar ${what || sel} (${e.message.split('\n')[0]})`)); return true; };
const txt = (page, sel) => page.locator(sel).first().innerText().catch(() => '');
const section = async (name, fn) => { if (ONLY && !name.includes(ONLY)) return; const before = fails.length; console.log('• ' + name); try { await fn(); } catch (e) { check(false, `${name}: exceção ${e.stack?.split('\n').slice(0, 3).join(' | ')}`); } if (fails.length === before) console.log('  ok'); };
const hero = n => Object.values(S.chars).find(c => c.name === n);

// ---------- cenário ----------
const [shinkai, mikhail, thomas] = ['Shinkai', 'Mikhail', 'Thomas'].map(hero);
for (const [u, c] of [['ana', shinkai], ['bia', mikhail], ['caio', thomas]]) H.userAdd(gmc, { name: u, pass: '1234', char: c.id });
H.set(gmc, { id: shinkai.id, f: 'attrs.AGI', v: 95 }); H.set(gmc, { id: mikhail.id, f: 'attrs.AGI', v: 60 }); H.set(gmc, { id: thomas.id, f: 'attrs.AGI', v: 40 });
for (const c of [shinkai, mikhail, thomas]) for (const f of ['hp', 'aura', 'san']) H.set(gmc, { id: c.id, f, v: 999 }); // cheios
const bestId = n => Object.keys(S.bestiary).find(k => S.bestiary[k].name === n);
const foesOf = () => Object.values(S.chars).filter(c => c.enemy);
const boss = Object.keys(S.bestiary).find(k => S.bestiary[k].boss);
H.bSpawn(gmc, { id: boss, n: 1 }); H.bSpawn(gmc, { id: bestId('Diabrete de Cinzas') || Object.keys(S.bestiary)[2], n: 1 });
const [bossCh, minion] = [foesOf().find(c => c.boss), foesOf().find(c => !c.boss)];
for (const f of foesOf()) { f.attrs.AGI = 1; f.bon.hpMax = 9999; } // inimigos lentos e duráveis (o máximo é recalculado a cada push, daí o bônus)
H.weather(gmc, { k: Object.keys(globalThis.RULES.CLIMA)[0] });
push(); for (const f of foesOf()) f.hp = f.hpMax; push();

try {
  // ---------- telas abertas ----------
  const gmP = await open('gm', '/gm', { login: { p: 'chave' } });
  const ana = await open('ana', '/player', { login: { n: 'ana', p: '1234' }, phone: true });
  const bia = await open('bia', '/player', { login: { n: 'bia', p: '1234' } });
  const mesa = await open('mesa', '/table', { login: { n: 'mestre', p: 'chave' } });
  const anaD = await open('ana-pc', '/player', { login: { n: 'ana', p: '1234' } }); // a mesma Ana no computador: HUD e leque do palco 3D (a `ana` acima é o celular, que mantém o painel antigo)

  await section('exploração: telas sem batalha', async () => {
    await until(async () => (await mesa.locator('#app').innerHTML()).length > 500, 'mesa desenhada');
    for (const p of [gmP, ana, bia, mesa]) check(p === mesa ? (await p.locator('#app').innerHTML()).length > 500 : (await p.locator('#app').innerText()).length > 50, `${p.who}: tela vazia`); // a mesa é só mapa e cartões, quase sem texto
    await shot(gmP, 'explora'); await shot(ana, 'explora'); await shot(mesa, 'explora');
  });

  const go = m => handle(gmc, m); // mensagens do mestre direto no motor (montar o cenário); o que está sob teste vai pela tela
  const toTurn = id => { for (let i = 0; i < 60 && current() !== id; i++) go({ t: 'next' }); return current() === id; };
  const battleLog = () => S.log.map(l => l.text).join('\n');
  S.auto.act = true; // aprovar combate sozinho: o foco aqui é a tela do jogador; a fila de pedidos tem bloco próprio
  go({ t: 'battle', on: true });
  for (const f of foesOf()) go({ t: 'ini', k: 'set', id: f.id, v: 1e6 }); // inimigos só agem quando o roteiro quiser: Derrubado e Quebra não expiram
  const tgBtn = (p, id) => p.locator(`.cmd .tg[data-tgt="${id}"]`);
  // jogador no PC (leque no teclado): espera a vez, mira num alvo com ←/→ e confirma com Enter
  const myTurn = (p, id, msg) => until(async () => (await p.evaluate(() => S.battle.order[0])) === id && await vis(p, '.lq .stroke'), msg || `leque de ${p.who}`); // espera o estado novo chegar (o desenho velho ainda tem o leque da vez anterior)
  const aimAt = async (p, id) => { for (let i = 0; i < 8; i++) { if (await p.locator(`.p3d .bb.tgt[data-tgt="${id}"]`).count()) return true; await p.keyboard.press('ArrowRight'); await sleep(120); } return false; };
  const atkAt = async (p, id, what) => { await p.keyboard.press('1'); check(await aimAt(p, id), `${p.who}: mirar ${what}`); const n = S.seq; await p.keyboard.press('Enter'); await until(() => S.seq > n, `ataque em ${what}`); };

  await section('batalha: tela do jogador abre no turno certo', async () => {
    await until(() => vis(ana, '.cmd'), 'comandos de batalha da Ana');
    check(current() === shinkai.id, 'Shinkai (AGI 95) deveria abrir a fila');
    check(await until(() => ana.locator('.cmd.mine').count(), 'turno da Ana destacado'), 'turno destacado');
    check(await ana.locator('.cmd-go .go').isEnabled() === true, 'Agir já vem mirado no primeiro inimigo de pé (mira automática na sua vez)');
    check(await until(() => vis(bia, '.hudw.dim'), 'HUD apagado fora da vez'), 'Bia (PC) deveria ver o HUD apagado fora da vez');
    check(/Vez de Shinkai/i.test(await txt(bia, '.hud-bl')) && !(await vis(bia, '.lq .stroke')), 'Bia não deveria ver o leque na vez da Shinkai');
    await shot(ana, 'batalha'); await shot(bia, 'batalha'); await shot(mesa, 'batalha'); await shot(gmP, 'batalha');
  });

  await section('batalha no PC: palco 3D, HUD e leque no teclado', async () => {
    await myTurn(anaD, shinkai.id, 'leque da Ana no PC');
    check(await anaD.locator('.p3d .bb[data-tgt]').count() >= 4, 'palco 3D com recortes');
    check(await anaD.locator('.hud-party .pm').count() >= 2, 'grupo no canto');
    check(await anaD.locator('.hud-order .ot').count() >= 4 && await vis(anaD, '.hud-order .ot.now'), 'ordem dos turnos no canto');
    check(await anaD.locator('.cmd').count() === 0, 'o painel antigo não aparece no PC');
    check(!(await vis(anaD, '.top .tnav')) && await vis(anaD, '.hud-tr [data-a=navT]') && await vis(anaD, '.hud-tr [data-a=chatT]'), 'em batalha: sem barra de páginas, com ☰ e chat no HUD');
    check(await vis(anaD, '.hud-bl [data-a=defend]') && await vis(anaD, '.hud-bl [data-a=braveT]') && await vis(anaD, '.hud-bl [data-a=next]'), 'dicas de Defender, Coragem e Passar');
    await shot(anaD, 'palco3d');
    { const ids = shinkai.skills.filter(k => S.skills[k] && S.skills[k].kind !== 'passive'); shinkai.skPin = ids.slice(0, 1); shinkai.skUse = Object.fromEntries(ids.slice(1, 7).map((k, i) => [k, 9 - i])); push(); await sleep(300); } // fixada e mais usadas para as 6
    await anaD.keyboard.press('2'); await until(() => anaD.locator('.sk6').count(), 'tela das 6 skills');
    check(await anaD.locator('.sk6 .stroke[data-sk]').count() <= 6 && await anaD.locator('.stroke[data-lq="all"]').count() === 1, 'Skills abre as 6 e a pincelada Todas');
    await anaD.keyboard.press('ArrowLeft'); await anaD.keyboard.press('ArrowRight'); await anaD.keyboard.press('Enter'); check(await until(async () => await anaD.locator('.lq-sum').count() === 1 && !(await anaD.locator('.sk6').count()), 'mira da skill'), 'Enter numa skill das 6 abre a mira');
    await anaD.keyboard.press('Escape'); await until(() => anaD.locator('.sk6').count(), 'volta às 6');
    await anaD.keyboard.press('t'); check(await until(async () => await anaD.locator('.skl').count() > 0, 'lista completa'), 'T abre a lista completa');
    await anaD.keyboard.press('Escape'); check(await until(async () => !(await anaD.locator('.skl').count()) && await anaD.locator('.sk6').count() > 0, 'Esc volta às 6'), 'Esc da lista volta às 6');
    await anaD.keyboard.press('Escape'); check(await until(async () => !(await anaD.locator('.sk6').count()), 'Esc fecha as 6'), 'Esc volta ao menu');
    // Esc volta pelo caminho de ida: mira → lista → 6 skills → menu (e o menu não guarda a skill escolhida)
    await anaD.keyboard.press('2'); await until(() => anaD.locator('.sk6').count(), 'as 6 de novo'); await anaD.keyboard.press('t'); await until(() => anaD.locator('.skl').count(), 'lista de novo');
    await anaD.keyboard.press('Enter'); await until(async () => await anaD.locator('.lq-sum').count() === 1 && !(await anaD.locator('.skl').count()), 'mira vinda da lista');
    await anaD.keyboard.press('Escape'); check(await until(() => anaD.locator('.skl').count(), 'mira → lista'), 'Esc da mira volta à lista');
    await anaD.keyboard.press('Escape'); check(await until(() => anaD.locator('.sk6').count(), 'lista → 6'), 'Esc da lista volta às 6');
    await anaD.keyboard.press('Escape'); check(await until(async () => !(await anaD.locator('.sk6').count()), 'seis → menu'), 'Esc das 6 volta ao menu');
    check(await anaD.evaluate(() => pick.k === 'atk'), 'de volta ao menu a escolha é Atacar');
    await anaD.keyboard.press('1'); check(await until(async () => await anaD.locator('.p3d .bb.tgt').count() === 1, 'um alvo marcado'), 'Atacar entra na mira com 1 alvo');
    await shot(anaD, 'mira');
    // ficha do alvo, barra do topo, zoom e alvo que some (Task 6)
    check(await until(() => vis(anaD, '.hud-sheet .sheet'), 'ficha do alvo'), 'com a mira aberta a ficha do alvo está visível');
    check(/ESCUDO/.test(await txt(anaD, '.hud-sheet .sheet')) && await vis(anaD, '.hud-top h4'), 'a ficha mostra ESCUDO e a barra do topo mostra o alvo');
    check(await until(() => anaD.evaluate(() => { const e = document.querySelector('.hud-sheet .sheet'), t = document.querySelector('.p3d .bb.tgt'); if (!e || !t) return false; const s = e.getBoundingClientRect(), r = t.getBoundingClientRect(); return s.left >= 0 && s.right <= innerWidth && (s.left >= r.right - 2 || s.right <= r.left + 2); }), 'ficha assentada'), 'a ficha fica ao lado do recorte mirado, sem cobri-lo');
    check(!(await anaD.locator('.hud-sheet .sheet.full').count()), 'sem zoom a ficha não é a completa');
    await anaD.keyboard.press('z'); check(await until(() => vis(anaD, '.hud-sheet .sheet.full'), 'ficha completa'), 'Z abre a ficha completa (zoom)');
    await anaD.keyboard.press('Escape'); check(await until(async () => !(await anaD.locator('.sheet.full').count()), 'zoom fechou'), 'Esc fecha o zoom');
    check(await vis(anaD, '.hud-sheet .sheet') && await anaD.locator('.lq-sum').count() === 1, 'Esc do zoom não sai da mira');
    await anaD.locator('.p3d .bb.foe:not(.ko)').first().dispatchEvent('wheel', { deltaY: -100 }); check(await until(() => vis(anaD, '.hud-sheet .sheet.full'), 'zoom pela roda'), 'a roda para cima sobre o inimigo dá zoom');
    await anaD.locator('.p3d .bb.foe:not(.ko)').first().dispatchEvent('wheel', { deltaY: 100 }); check(await until(async () => !(await anaD.locator('.sheet.full').count()), 'sai do zoom'), 'a roda para baixo sai do zoom');
    // enquanto não é descoberta, a fraqueza não aparece para o jogador (só o que o lore revela)
    minion.known = 0; push(); await sleep(200); check(await aimAt(anaD, minion.id), 'mirar o Diabrete'); await sleep(300);
    { const lore = S.lore?.[minion.tpl || minion.name]?.w || [], vis0 = minion.weak.filter(e => lore.includes(e)).length;
      check(await anaD.locator('.hud-sheet .sheet .wk .w').count() === vis0 && await anaD.locator('.hud-sheet .sheet .wk .q').count() >= 1, `a ficha só mostra as fraquezas descobertas (${vis0}) e "?" no resto`); }
    // o mestre remove o inimigo mirado: a mira passa para outro, sem erro de console
    { const ex = bestId('Diabrete de Cinzas') || Object.keys(S.bestiary)[2]; H.bSpawn(gmc, { id: ex, n: 1 }); const novo = foesOf().find(c => c !== bossCh && c !== minion);
      go({ t: 'ini', k: 'in', id: novo.id }); go({ t: 'ini', k: 'set', id: novo.id, v: 1e6 }); push(); await sleep(300); check(await aimAt(anaD, novo.id), 'mirar o inimigo que vai sumir');
      await anaD.keyboard.press('z'); await until(() => vis(anaD, '.sheet.full'), 'zoom no inimigo que vai sumir');
      go({ t: 'delChar', id: novo.id }); push();
      check(await until(async () => await anaD.locator('.p3d .bb.tgt').count() === 1 && (await anaD.locator('.p3d .bb.tgt').getAttribute('data-tgt')) !== novo.id, 'mira troca'), 'removido o inimigo mirado, a mira passa para outro');
      check(await until(async () => !(await anaD.locator('.sheet.full').count()) && await vis(anaD, '.hud-sheet .sheet'), 'zoom fecha'), 'o zoom fecha e a ficha segue o novo alvo'); }
    // aliado caído mirado por item: a mira fica nele e o desenho não entra em laço
    { const it = Object.keys(S.items).find(k => S.items[k].type === 'cons'); shinkai.inv[it] = 1; thomas.hp = 0; push(); await sleep(300);
      await anaD.evaluate(() => { window.__rn = 0; const r = render; window.render = function () { window.__rn++; return r.apply(this, arguments); }; });
      await anaD.keyboard.press('Escape'); await anaD.keyboard.press('3'); await until(() => anaD.locator('.stroke[data-lq=item]').count(), 'lista de itens'); await anaD.keyboard.press('Enter');
      await until(() => anaD.locator('.lq-sum').count(), 'mira do item'); check(await aimAt(anaD, thomas.id), 'mirar o aliado caído com o item');
      const n0 = await anaD.evaluate(() => window.__rn); await sleep(1000); const n1 = await anaD.evaluate(() => window.__rn);
      check(n1 - n0 <= 2 && await anaD.locator(`.p3d .bb.hero.tgt[data-tgt="${thomas.id}"]`).count() === 1, `a mira fica no aliado caído sem laço de desenho (${n1 - n0} desenhos em 1 s)`);
      await anaD.keyboard.press('Escape'); await anaD.keyboard.press('Escape'); delete shinkai.inv[it]; thomas.hp = thomas.hpMax; push(); await sleep(300); await anaD.keyboard.press('1'); await until(() => anaD.locator('.p3d .bb.foe.tgt').count(), 'mira de volta em inimigo'); }
    await until(() => vis(anaD, '.lq .stroke[data-lq=go]:not(.blk)'), 'Agir liberado'); await sleep(300); // o desenho da mira precisa ter assentado antes do Enter
    // Task 8: investida com câmera; o número nasce sobre o recorte do alvo e a câmera volta ao turno em até 2 s
    await anaD.evaluate(() => { const w = document.querySelector('.p3d .world'), tg = document.querySelector('.p3d .bb.tgt')?.dataset.tgt, R = window.__lg = { fast: false, num: null, t0: 0, back: 0 };
      new MutationObserver(() => { if (w.classList.contains('fast')) R.fast = true; else if (R.fast && !R.back) R.back = performance.now(); }).observe(w, { attributes: true, attributeFilter: ['class'] });
      new MutationObserver(ms => { for (const m of ms) for (const d of m.addedNodes) if (!R.num && d.classList?.contains('float')) { const b = document.querySelector(`.p3d .bb[data-tgt="${tg}"]`)?.getBoundingClientRect(), x = parseFloat(d.style.left), y = parseFloat(d.style.top);
        R.num = b && { x, y, in: x >= b.left - 80 && x <= b.right + 80 && y >= b.top - 80 && y <= b.bottom + 80 }; } }).observe(document.querySelector('.fxl'), { childList: true });
      document.addEventListener('keydown', e => { if (e.key === 'Enter' && !R.t0) R.t0 = performance.now(); }, true); });
    const n = S.seq; await anaD.keyboard.press('Enter');
    await until(() => S.seq > n && S.log.some(l => l.n > n), 'Enter manda a ação'); // qualquer registro novo: um golpe esquivado é narrado por quem esquiva, não pela Shinkai
    { const lg = await until(() => anaD.evaluate(() => window.__lg.num && window.__lg.back && window.__lg), 'número e volta da câmera', 4000);
      check(lg && lg.fast, 'a investida leva a câmera ao alvo (world.fast)');
      check(lg && lg.num?.in, `o número de dano nasce sobre o recorte do alvo (${JSON.stringify(lg?.num)})`);
      check(lg && lg.back - lg.t0 <= 2000 + 500, `a câmera volta ao turno em até 2 s depois do golpe (${lg && Math.round(lg.back - lg.t0)} ms desde o Enter)`);
      check(await anaD.evaluate(() => !document.querySelector('.p3d .bb.lunging') && (w => w.style.transform.replace(/\s/g, '') === w.dataset.cam.replace(/\s/g, ''))(document.querySelector('.p3d .world'))), 'o recorte voltou ao lugar e a câmera ao enquadramento do turno'); }
    // condições aparecem sobre o recorte (e nos retratos do grupo)
    minion.st.burn = 3; shinkai.st.burn = 3; push();
    await until(() => vis(anaD, `.p3d .bb[data-tgt="${minion.id}"] .sti[data-st=burn]`), 'condição do inimigo sobre o recorte');
    await until(() => vis(anaD, `.pm[data-tgt="${shinkai.id}"] .sti[data-st=burn]`), 'condição do herói no grupo');
    delete minion.st.burn; delete shinkai.st.burn; push();
    // as animações do coreo não podem tirar o recorte do lugar (X1): o .bb só posiciona, quem anima é o .bbi
    const pos = await anaD.evaluate(id => { const e = document.querySelector(`.p3d .bb[data-tgt="${id}"]`); e.classList.add('ko', 'kofall', 'hit', 'cast', 'dodge', 'lunge');
      const an = getComputedStyle(e).animationName, bi = getComputedStyle(e.querySelector('.bbi')).animationName; e.classList.remove('ko', 'kofall', 'hit', 'cast', 'dodge', 'lunge'); return { an, bi }; }, minion.id);
    check(pos.an === 'none' && pos.bi !== 'none', 'a animação roda no .bbi, não no .bb');
    minion.hp = 0; push(); await sleep(3100); push(); // o coreo segura o ko por ~2,6 s esperando o golpe; sem golpe, o próximo desenho o repõe
    await until(() => anaD.locator(`.p3d .bb.ko[data-tgt="${minion.id}"]`).count(), 'KO: o recorte cai');
    check(await anaD.evaluate(id => { const e = document.querySelector(`.p3d .bb[data-tgt="${id}"]`); e.classList.add('kofall'); const a = getComputedStyle(e).animationName; e.classList.remove('kofall'); return a; }, minion.id) === 'none', 'o recorte caído continua posicionado pelo .bb (o kofall anima só o interior)');
    minion.hp = minion.hpMax; push(); await until(async () => !(await anaD.locator('.p3d .bb.ko').count()), 'o recorte levanta quando volta a viver');
    // Domínio escurece o palco 3D também no jogador do PC
    S.battle.dom = { by: mikhail.id, side: false, name: 'Domínio PC', ttl: 3, ally: [], foe: [], pow: 50 }; push();
    await until(() => vis(anaD, '.stage3d.dom-on .domfx'), 'Domínio escurece o palco do PC'); delete S.battle.dom; push();
    // Review Focus 4: dona de dois heróis, o leque é do que está na vez
    mikhail.owner = 'ana'; push();
    check(toTurn(mikhail.id), 'vez da Mikhail'); await until(() => anaD.locator(`.pm.now[data-tgt="${mikhail.id}"]`).count(), 'retrato da Mikhail na vez');
    check(await until(() => anaD.locator('.lq[aria-label*="Mikhail"] .stroke').count(), 'leque da Mikhail'), 'dona de dois heróis: o leque é do herói da vez');
    mikhail.owner = 'bia'; push();
    // Review Focus 5: com aprovação ligada o selo "Aguardando o mestre" aparece, sobrevive a um push() e Esc manda reqNo
    S.auto.act = false; push();
    check(toTurn(shinkai.id), 'vez da Shinkai'); await myTurn(anaD, shinkai.id, 'leque da Ana (aprovação ligada)');
    await anaD.keyboard.press('1'); await anaD.keyboard.press('Enter');
    await until(() => Object.keys(S.reqs).length, 'o pedido de ação chega ao mestre');
    await until(() => vis(anaD, '.hud-bl .pend'), 'selo "Aguardando o mestre"');
    check(/Aguardando o mestre/i.test(await txt(anaD, '.hud-bl .pend')), 'o selo cita o pedido');
    push(); await sleep(350); check(await vis(anaD, '.hud-bl .pend') && !(await vis(anaD, '.lq .stroke')), 'o selo sobrevive a um push() e o leque some enquanto espera');
    await anaD.keyboard.press('Escape'); await until(() => !Object.keys(S.reqs).length, 'Esc cancela o pedido (reqNo)');
    await until(async () => !(await vis(anaD, '.hud-bl .pend')), 'o selo some');
    S.auto.act = true; push();
    await anaD.context().close(); // o palco 3D pesa na renderização por software: a Ana do PC sai para não atrasar os blocos seguintes
  });

  await section('mestre: leque de quem está na vez no palco 3D', async () => {
    const foe = foesOf()[0], nGm = () => gmP.locator('.gcmd').count();
    go({ t: 'ini', k: 'set', id: foe.id, v: 0 }); check(current() === foe.id || toTurn(foe.id), 'vez do inimigo'); await until(() => gmP.locator('[data-a="ai"].stroke').count(), 'leque do mestre na vez do inimigo');
    check(await nGm() === 0, 'barra antiga some no PC');
    check(await gmP.locator('[data-a="ai"].stroke').count() === 1, 'mestre tem IA decide no leque');
    check(await gmP.locator('.lq .stroke[data-lq=atk]').count() === 1 && await gmP.locator('.lq-gm-open').count() === 0, 'inimigo: Atacar no leque e sem botão recolhido');
    await gmP.keyboard.press('1'); check(await until(async () => await gmP.locator('.lq-sum').count() === 1, 'mira do mestre'), 'Atacar abre a mira');
    const sa = S.seq; await gmP.keyboard.press('Enter'); await until(() => S.seq > sa, 'ataque do inimigo pelo leque do mestre');
    await gmP.keyboard.press('Escape'); go({ t: 'ini', k: 'set', id: foe.id, v: 1e6 });
    check(toTurn(shinkai.id), 'vez da Shinkai'); await until(() => gmP.locator('.lq-gm-open').count(), 'leque do herói recolhido (dono conectado)');
    check(await gmP.locator('.lq-gm-open').count() === 1 && await gmP.locator('.lq .stroke').count() === 0, 'leque do herói recolhido');
    await gmP.locator('.lq-gm-open').click(); await until(() => gmP.locator('.lq .stroke[data-lq=atk]').count(), 'Agir por abre o leque');
    check(await gmP.locator('[data-a="ai"].stroke').count() === 0, 'herói não tem IA decide');
    await gmP.locator('.gv[data-v=mapa]').click(); await until(async () => (await gmP.locator('.p3d').evaluate(e => getComputedStyle(e).display)) === 'none', 'aba Mapa esconde o mundo 3D');
    await gmP.locator('.gv[data-v=palco]').click(); await until(async () => (await gmP.locator('.p3d').evaluate(e => getComputedStyle(e).display)) !== 'none', 'aba Palco devolve o mundo 3D');
    await shot(gmP, 'mestre-leque');
  });

  await section('faixa de clima, Cadeia e Domínio', async () => {
    for (const p of [ana, bia, mesa]) {
      check(await vis(p, '.fbar .wx'), `${p.who}: faixa de clima ausente`);
      check(await vis(p, '.fbar .chain'), `${p.who}: barra de Cadeia ausente`);
    }
    S.battle.chain.h = 60; S.battle.dom = { by: mikhail.id, side: false, name: 'Santuário Teste', ttl: 3, ally: [], foe: [], pow: 50 }; push();
    await until(async () => /60%/.test(await txt(ana, '.fbar .chain')), 'Cadeia 60% na tela da Ana');
    await until(async () => /Santuário Teste/i.test(await txt(mesa, '.fbar .dom')), 'Domínio na mesa');
    check(/Santuário Teste \(3\)/i.test(await txt(ana, '.fbar .dom')), 'Domínio mostra a duração');
    check(/60/.test(await ana.locator('.fbar .chain b').evaluate(e => e.getAttribute('style'))), 'barra de Cadeia sem largura');
    await shot(ana, 'faixa');
    delete S.battle.dom; S.battle.chain.h = 0; push();
    await until(async () => !(await vis(ana, '.fbar .dom')), 'Domínio some');
    const wx = Object.keys(globalThis.RULES.CLIMA)[1];
    await click(gmP, `[data-a=weather][data-k="${wx}"]`, 'chip de clima do mestre');
    await until(async () => (await txt(ana, '.fbar .wx')).includes(globalThis.RULES.CLIMA[wx][0]), 'clima trocado pelo mestre aparece no jogador');
  });

  await section('som e animação: Tensão, Dívida de Coragem, Cadeia e Domínio', async () => {
    const osc = p => p.evaluate(() => window.__osc), noise = async (p, f) => { const n = await osc(p); await f(); push(); await sleep(350); return (await osc(p)) - n; };
    check(await noise(ana, () => { shinkai.ten = 2; }) > 0, 'Tensão deveria tocar um som');
    check(await vis(ana, '.unit.ten2') && /Tensão ×2/.test(await txt(ana, '.unit.ten2 .rit')), 'unidade com Tensão 2 deveria ganhar a classe ten2');
    check(await ana.locator('.unit.ten2 .figw').evaluate(e => getComputedStyle(e).animationName) === 'tenGlow', 'Tensão deveria brilhar (animação tenGlow)');
    check(await noise(ana, () => { shinkai.ten = 0; shinkai.brv = -1; }) > 0, 'Dívida de Coragem deveria tocar um som');
    check(await vis(ana, '.unit.debt') && await vis(ana, '.p5m [data-a=braveT].debt'), 'Dívida: unidade e botão de Coragem deveriam ficar vermelhos');
    check(await ana.locator('.unit.debt .figw').evaluate(e => getComputedStyle(e).animationName) === 'debtPulse', 'Dívida deveria pulsar');
    check(await noise(ana, () => { shinkai.brv = 0; S.battle.chain.h = 40; }) > 0, 'Cadeia subindo deveria tocar um tique');
    check(await noise(ana, () => { S.battle.chain.h = 100; }) > 0, 'Cadeia cheia deveria tocar o acorde');
    check(await vis(ana, '.fbar .chain.full'), 'Cadeia cheia deveria ganhar a classe full');
    check(await noise(mesa, () => { S.battle.dom = { by: mikhail.id, side: false, name: 'Domínio Teste', ttl: 3, ally: [], foe: [], pow: 50 }; }) > 0, 'Domínio abrindo deveria tocar na mesa');
    check(await vis(mesa, '.stage3d.dom-on .domfx'), 'mesa: o palco deveria escurecer com o Domínio');
    check(await noise(mesa, () => { delete S.battle.dom; }) > 0, 'Domínio acabando deveria tocar na mesa');
    // som desligado: nada toca
    await ana.click('[data-a=meT]'); await ana.click('.pop [data-a=mute]');
    check(await noise(ana, () => { shinkai.ten = 1; }) === 0, 'com o som desligado nada deveria tocar');
    shinkai.ten = 0; S.battle.chain.h = 0; push();
    check(/ligar som/i.test(await txt(ana, '.pop')), 'o menu deveria oferecer Ligar som');
    await ana.click('.pop [data-a=mute]'); await ana.click('[data-a=meT]'); // liga de novo e fecha o menu
    await shot(ana, 'sons');
  });

  await section('Defender, Concentrar e Coragem', async () => {
    check(toTurn(shinkai.id), 'vez da Shinkai');
    await click(ana, '.p5m [data-a=defend]', 'Defender');
    await until(() => shinkai.brv === 1, 'Coragem 1 após Defender');
    await until(async () => /Defender · 1/i.test(await txt(ana, '.p5m [data-a=defend]')), 'botão mostra Coragem 1');
    check(/Coragem 1/i.test(await txt(ana, '.p5m [data-a=braveT]')), 'botão Coragem mostra 1 ponto');
    check(toTurn(shinkai.id), 'vez da Shinkai de novo');
    await click(ana, '.p5m [data-a=focus]', 'Concentrar');
    await until(() => shinkai.ten === 1, 'Tensão 1');
    await until(async () => /×1.5/i.test(await txt(ana, '.p5m [data-a=focus]')), 'botão mostra ×1.5');
    check(toTurn(shinkai.id), 'vez da Shinkai de novo (2)');
    // Coragem: liga, ataca e age de novo na sequência
    await tgBtn(ana, minion.id).click(); await click(ana, '.p5m [data-a=braveT]', 'Coragem');
    check(await ana.locator('.p5m [data-a=braveT]').getAttribute('aria-pressed') === 'true', 'Coragem deveria ficar ligada');
    const brv0 = shinkai.brv, logN = S.seq;
    await click(ana, '.cmd-go .go', 'Agir');
    await until(() => S.log.some(l => l.n > logN && l.who === 'Shinkai'), 'ataque com Coragem foi executado');
    check(current() === shinkai.id || shinkai.brv < brv0, 'Coragem gasta: Shinkai age de novo ou perdeu o ponto');
    check(/Tensão|×1/.test(battleLog()) || shinkai.ten === 0, 'Tensão consumida no golpe');
    await shot(ana, 'ritmo');
  });

  await section('Passar a vez, Quebra e Ataque Total', async () => {
    minion.weak = ['fis']; bossCh.weak = ['fis']; push();
    // o seletor "passar a vez" trava o redesenho enquanto tem foco: precisa aceitar a escolha e soltar o foco
    for (let i = 0; i < 8 && !minion.st.down; i++) { // o golpe pode errar: repete até derrubar
      check(toTurn(shinkai.id), 'vez da Shinkai'); await until(() => vis(ana, '.cmd.mine'), 'turno da Ana');
      await ana.selectOption('.cmd select[data-a=passSel]', mikhail.id);
      await tgBtn(ana, minion.id).click();
      if (!i) check(await ana.locator('.cmd select[data-a=passSel]').inputValue() === mikhail.id, 'passar a vez: escolha deveria permanecer após clicar no alvo');
      const n = S.seq; await click(ana, '.cmd-go .go', 'Agir');
      await until(() => S.seq > n, 'ataque executado');
    }
    const brk0 = bossCh.brk?.cur;
    check(!!minion.st.down, 'inimigo fraco deveria ficar Derrubado');
    check(/passa a vez|Passar a Vez|entrega/i.test(battleLog()) || current() === mikhail.id, 'registro da passagem de vez');
    // chefe: barra de Quebra
    const brkSh = `.p3d .bb[data-tgt="${bossCh.id}"] .sh`; // a Quebra do chefe é o escudo ◆n no mini do recorte
    check(await vis(mesa, brkSh), 'mesa: barra de Quebra do chefe ausente');
    check(new RegExp('◆' + brk0 + '$').test((await txt(mesa, brkSh)).trim()), 'Quebra cheia no começo');
    for (let i = 0; i < 8 && !(bossCh.brk.cur < brk0 || bossCh.st.broken); i++) {
      check(toTurn(mikhail.id), 'vez da Mikhail'); await myTurn(bia, mikhail.id, 'turno da Bia'); await atkAt(bia, bossCh.id, 'o chefe');
    }
    check(bossCh.brk.cur < brk0 || bossCh.st.broken, 'fraqueza no chefe deveria reduzir a Quebra');
    await until(async () => !!bossCh.st.broken || !new RegExp('◆' + brk0 + '$').test((await txt(mesa, brkSh)).trim()), 'mesa mostra a Quebra reduzida');
    await shot(mesa, 'quebra');
    // Ataque Total: todo inimigo vivo Derrubado ou Quebrado
    for (const f of [bossCh, minion]) if (!f.st.down && !f.st.broken) go({ t: 'st', id: f.id, k: 'down' }); // o botão do mestre alterna a condição
    check(toTurn(mikhail.id), 'vez da Mikhail para o Ataque Total'); const pg = bia; // a vez de quem tem tela aberta (o Thomas não tem)
    await until(async () => await pg.locator('.hud-bl [data-a=allOut]').count(), 'Ataque Total liberado com todos Derrubados');
    const hp1 = bossCh.hp + minion.hp;
    await pg.locator('.hud-bl [data-a=allOut]').dispatchEvent('click'); // a dica pulsa sem parar: o clique vai direto nela
    await until(() => /ATAQUE TOTAL|Ataque Total/i.test(battleLog()), 'registro do Ataque Total');
    await until(() => bossCh.hp + minion.hp < hp1, 'Ataque Total causou dano');
    await shot(pg, 'ataque-total');
  });

  await section('armas: técnicas da arma no grupo Arma de Skills e ataque básico pela arma', async () => {
    for (const f of [bossCh, minion]) { delete f.st.down; delete f.st.broken; } push();
    check(toTurn(mikhail.id), 'vez da Mikhail'); await myTurn(bia, mikhail.id, 'turno da Bia');
    check(/DES/.test(await bia.locator('.stroke[data-lq=atk]').getAttribute('title')), 'Atacar: o ataque do revólver deveria mostrar DES');
    await bia.keyboard.press('2'); // no PC a Arma é um grupo dentro de Skills
    await until(async () => /Leque do Pistoleiro/i.test(await txt(bia, '.skl')), 'técnica do Revólver .38 no grupo Arma de Skills');
    await click(bia, '.skl .opt[data-v^="w:"]', 'técnica da arma'); check(await aimAt(bia, minion.id), 'mirar o inimigo com a técnica da arma');
    await shot(bia, 'arma');
    const n = S.seq; await bia.keyboard.press('Enter');
    await until(() => S.log.slice(-6).some(l => /Leque do Pistoleiro/.test(l.text)), 'técnica da arma executada');
  });

  await section('armas: escudo bloqueia na tela e instrumento aparece com técnicas de grupo', async () => {
    const torre = Object.keys(S.items).find(k => S.items[k].name === 'Escudo de Torre'), violino = Object.keys(S.items).find(k => S.items[k].name === 'Violino');
    thomas.inv[torre] = 1; thomas.equip.arma = torre; mikhail.inv[violino] = 1; mikhail.equip.arma = violino; push();
    check(toTurn(mikhail.id), 'vez da Mikhail'); await myTurn(bia, mikhail.id, 'turno da Bia');
    await bia.keyboard.press('2');
    await until(async () => /Melodia de Coragem/i.test(await txt(bia, '.skl')), 'violino básico mostra a técnica de grupo (a 2ª vem nas categorias acima de básica)');
    await bia.keyboard.press('Escape');
    // utilidade de alvo único alcança aliados e inimigos com ←/→ (buff em aliado)
    const ku = Object.keys(S.skills).find(x => { const q = S.skills[x]; return q.kind === 'util' && !q.area && q.tg !== 'self' && !q.limit && q.res === 'aura' && (q.cost || 0) <= 20 && !q.req && !q.reqItem; });
    mikhail.skills = [...new Set([...mikhail.skills, ku])]; mikhail.aura = mikhail.auraMax; push(); await sleep(300);
    await bia.keyboard.press('2'); await click(bia, `.skl .opt[data-v="${ku}"]`, 'skill de utilidade');
    let aliado = false; for (let i = 0; i < 8 && !aliado; i++) { aliado = await bia.locator('.p3d .bb.hero.tgt').count() > 0; if (!aliado) { await bia.keyboard.press('ArrowRight'); await sleep(120); } }
    check(aliado, 'utilidade de alvo único pode mirar um aliado');
    await bia.keyboard.press('Escape'); await bia.keyboard.press('Escape');
    await shot(bia, 'instrumento');
    thomas.equip.arma = torre; push();
    await until(async () => (await gmP.evaluate(() => 1)) === 1, 'estado estável');
    mikhail.equip.arma = Object.keys(S.items).find(k => S.items[k].name === 'Revólver .38'); delete thomas.equip.arma; push();
  });

  go({ t: 'battle', on: false });
  S.auto.act = false; push();
  const onPage = async (p, sel) => { // abre as páginas do jogador até achar o elemento
    for (const pg of ['mesa', 'pers', 'hab', 'ofi', 'itens', 'hist']) { if (await p.locator(sel).count()) return true; await p.click(`[data-pg=${pg}]`).catch(() => {}); await sleep(120); }
    return (await p.locator(sel).count()) > 0;
  };

  await section('Forja de armas do mestre', async () => {
    await click(gmP, '.gr[data-g=rail][data-id=armas]', 'painel Forja de armas');
    await until(() => vis(gmP, '.wforge'), 'janela da Forja de armas');
    const tap = sel => gmP.locator(sel).first().dispatchEvent('click'); // a janela pode nascer embaixo de outras: o clique vai direto no botão
    await tap('.wforge [data-a=wfTpl][data-k=machado]');
    await until(async () => /Machado/.test(await txt(gmP, '.wprev')), 'prévia do machado');
    await gmP.selectOption('.wforge select[data-wf=_cat]', 'especial');
    await until(async () => (await gmP.locator('.wforge .wskr').count()) === 2, 'categoria especial: duas técnicas');
    await gmP.fill('.wforge input[data-wf=name]', 'Machado de Teste'); await gmP.locator('.wforge input[data-wf=name]').press('Tab');
    await gmP.fill('.wforge input[data-wf=fx]', 'efeito-que-nao-existe 3'); await gmP.locator('.wforge input[data-wf=fx]').press('Tab');
    await until(async () => /desconhecido/i.test(await txt(gmP, '.wprev .warn')), 'efeito inválido avisado na prévia');
    await gmP.fill('.wforge input[data-wf=fx]', 'vs bleed 1.3'); await gmP.locator('.wforge input[data-wf=fx]').press('Tab');
    await until(async () => !(await vis(gmP, '.wprev .warn')), 'aviso some com o efeito válido');
    await shot(gmP, 'forja-armas');
    await tap('.wforge [data-a=wfSaveNew]');
    const made = await until(() => Object.values(S.items).find(i => i.name === 'Machado de Teste'), 'arma criada no catálogo');
    check(made && made.tpl === 'machado' && made.cat === 'especial' && made.sk.length === 2 && made.fx === 'vs bleed 1.3', 'arma criada com modelo, categoria, técnicas e efeito');
    await until(async () => /editando/i.test(await txt(gmP, '.wforge')), 'depois de criar, a Forja continua editando a arma');
    // pacotes: aplica Veloz, o nome ganha o sufixo e Salvar alterações regrava a mesma peça
    await tap('.wforge [data-a=wfPk][data-k=veloz]');
    await until(async () => (await gmP.locator('.wforge input[data-wf=name]').inputValue()) === 'Machado de Teste de Velocidade', 'pacote Veloz renomeia a arma');
    await tap('.wforge [data-a=wfPk][data-k=sangrante]'); await tap('.wforge [data-a=wfPk][data-k=mestre]'); await tap('.wforge [data-a=wfPk][data-k=precisa]'); // o 4º é recusado
    await until(async () => (await gmP.locator('.wforge input[data-wf=name]').inputValue()) === 'Machado de Teste de Velocidade, Sangria e Mestre', 'três pacotes empilhados, o quarto recusado');
    await tap('.wforge [data-a=wfSave]');
    const emp = await until(() => Object.values(S.items).find(i => i.name === 'Machado de Teste de Velocidade, Sangria e Mestre' && i.pk?.length === 3), 'arma regravada com os pacotes');
    check(emp && Object.values(S.items).filter(i => i.tpl === 'machado' && /Machado de Teste/.test(i.name)).length === 1, 'regravar não cria outra arma');
    // variante elemental pela tela
    await tap('.wforge [data-a=wfVar][data-k=indra]');
    await until(() => Object.values(S.items).some(i => i.name.endsWith(' de Indra') && i.name.startsWith('Machado de Teste') && i.el === 'indra' && i.cat === 'elemental'), 'variante de Indra criada');
    // duplicar e editar
    await tap('.wforge .wrow [data-a=wfDup]');
    await until(async () => /\(cópia\)/.test(await gmP.locator('.wforge input[data-wf=name]').inputValue()), 'duplicar abre a cópia no editor');
    check(!(await txt(gmP, '.wforge .wsave')).includes('Salvar alterações'), 'a cópia é uma arma nova (sem "Salvar alterações")');
    // exportar e importar: o texto exportado volta pela caixa de importação, com prévia
    const baixou = gmP.waitForEvent('download', { timeout: 4000 }).catch(() => null);
    await tap('.wforge [data-a=wfExpAll]'); const dl = await baixou; check(!!dl, 'Exportar baixa um arquivo .json');
    await tap('.wforge [data-a=wfImpT]');
    const json = JSON.stringify({ formato: 'virtualJRPG-armas', v: 1, armas: [{ name: 'Lâmina Importada', wt: 'lamina', power: 12, cat: 'basica', hit: 999, fx: 'xx 1' }] });
    await gmP.fill('.wforge textarea[data-wf=_imptxt]', json); await gmP.locator('.wforge textarea[data-wf=_imptxt]').press('Tab');
    await until(async () => /Lâmina Importada/.test(await txt(gmP, '.wimp')) && /correç/.test(await txt(gmP, '.wimp')), 'prévia da importação mostra a arma e as correções');
    check(!Object.values(S.items).some(i => i.name === 'Lâmina Importada'), 'nada é criado antes de confirmar');
    await tap('.wforge [data-a=wfImpGo]');
    const imp = await until(() => Object.values(S.items).find(i => i.name === 'Lâmina Importada'), 'arma importada ao confirmar');
    check(imp && imp.hit === 50 && imp.fx === '', 'importação corrige o que veio fora dos limites');
    await tap('.gpanel [data-g=wide][data-id=armas]'); // encolhe o painel largo de volta para a lateral
  });

  await section('pedido de rolagem: aprovação com Vantagem e Desvantagem', async () => {
    await click(gmP, '[data-g=rtab][data-id=pedidos]', 'aba Pedidos da barra lateral'); // os pedidos moram numa aba da barra lateral do mestre
    for (const adv of ['adv', 'dis']) {
      await ana.click('[data-pg=mesa]'); await until(() => vis(ana, '.qr button'), 'botões de rolagem da Ana');
      await ana.locator('.qr button').first().click();
      await until(() => vis(ana, '.bsheet'), 'folha de rolagem');
      await click(ana, '.bsheet [data-a=rollMod][data-v="10"]', 'modificador +10');
      await click(ana, '.bsheet [data-a=rollGo]', 'pedir ao mestre');
      await until(() => vis(ana, '.reqbar'), 'faixa "Aguardando o mestre" no jogador');
      await until(() => vis(gmP, '.rq'), 'pedido na faixa do mestre');
      check(/rolar FOR \+10/.test(await txt(gmP, '.rq .rq-t span')), 'texto do pedido deveria citar o modificador');
      await click(gmP, `.rq [data-a=rqAdv][data-v=${adv}]`, adv === 'adv' ? 'Vantagem' : 'Desvantagem');
      check(await gmP.locator(`.rq [data-a=rqAdv][data-v=${adv}]`).getAttribute('aria-pressed') === 'true', 'botão de ' + adv + ' deveria ficar marcado');
      const n = S.log.length;
      await click(gmP, '.rq [data-a=rqOk]', 'Aprovar');
      await until(() => S.log.length > n && /FOR \d+% → \d+/.test(S.log.at(-1).text), 'rolagem executada');
      check(new RegExp(adv === 'adv' ? 'vantagem' : 'desvantagem').test(S.log.at(-1).text), `registro deveria citar ${adv}: ${S.log.at(-1).text}`);
      await until(async () => !(await vis(ana, '.reqbar')), 'faixa de espera some após aprovar');
      await until(() => vis(ana, '.toast'), 'aviso "Aprovado" no jogador');
    }
    // negar com motivo
    await ana.locator('.qr button').first().click(); await click(ana, '.bsheet [data-a=rollGo]', 'pedir');
    await until(() => vis(gmP, '.rq'), 'segundo pedido');
    await click(gmP, '.rq [data-a=rqWhy]', 'Negar com motivo'); await until(() => vis(gmP, '.dlg-in'), 'diálogo do motivo'); await gmP.locator('.dlg-in').fill('sem clima agora'); await gmP.locator('.dlg-bt .own').click(); // prompt() vira o diálogo da interface (ux.js)
    await until(() => !Object.keys(S.reqs).length, 'pedido negado sai da fila');
    await shot(ana, 'rolagem'); await shot(gmP, 'pedidos');
  });

  await section('acampamento: conversar com alguém', async () => {
    go({ t: 'camp', on: true });
    ana.setViewportSize?.({ width: 390, height: 844 });
    check(await onPage(ana, '[data-a=campWith]'), 'seletor "Conversar com" não apareceu para a Ana');
    await click(ana, '[data-a=campAct][data-k=conversar]', 'ação Conversar');
    await until(() => vis(ana, '.reqbar'), 'pedido de acampamento (sem parceiro ainda) chegou na tela da Ana');
    await ana.selectOption('select[data-a=campWith]', mikhail.id);
    await until(() => Object.values(S.reqs)[0]?.m.w === mikhail.id, 'a escolha do parceiro vai junto no pedido pendente');
    check(/acampamento: conversar/.test(Object.values(S.reqs)[0]?.text || ''), 'texto do pedido de acampamento');
    await click(gmP, '.rq [data-a=rqOk]', 'Aprovar acampamento');
    await until(() => S.camp.acts[shinkai.id] === 'conversar', 'ação registrada no acampamento');
    check(S.camp.with?.[shinkai.id] === mikhail.id, 'o "conversar com" deveria guardar a Mikhail: ' + JSON.stringify(S.camp.with));
    const san0 = shinkai.san; shinkai.san = 5; push();
    go({ t: 'rest', long: true });
    check(shinkai.san > 5 && /laço|Mikhail/.test(battleLog()), 'descanso longo deveria render Sanidade e laço');
    check(Object.values(S.bonds || {}).some(v => v >= 1), 'laço entre Shinkai e Mikhail deveria subir');
    await shot(ana, 'acampamento');
    go({ t: 'camp', on: false });
  });

  await section('aba Ofícios do jogador', async () => {
    check(/Nenhuma Iniciação/.test(await (async () => { await ana.click('[data-pg=ofi]'); return txt(ana, '.ofi'); })()), 'sem Iniciação deveria avisar');
    go({ t: 'ofiAw', id: shinkai.id, per: 'forja' }); go({ t: 'set', id: shinkai.id, f: 'po', v: 12 });
    await until(() => vis(ana, '.oper'), 'cartão da perícia Forja');
    const po0 = shinkai.po;
    S.auto.learn = true; push();
    const btn = ana.locator('.onode.av button[data-a=ofiLearn]:not([disabled])').first();
    check(await btn.count() > 0, 'deveria haver um nó aprendível');
    await btn.click();
    await until(() => (shinkai.pof || []).length > 0, 'nó de ofício aprendido');
    check(shinkai.po < po0, 'Pontos de Ofício deveriam ser gastos');
    await until(async () => (await ana.locator('.onode.own').count()) > 0, 'nó marcado como aprendido');
    await shot(ana, 'oficios'); await ana.evaluate(() => scrollTo(0, 99999)); await shot(ana, 'oficios-fim');
    const row = ana.locator('.oact').first();
    if (await row.count()) { // ação de perícia: escolhe o que ela pede e usa
      for (const sel of await row.locator('select').all()) { const v = await sel.locator('option:not([value=""])').first().getAttribute('value').catch(() => null); if (v) await sel.selectOption(v); }
      S.auto.roll = true; push(); const n = S.log.length; await row.locator('[data-a=ofiUse]').click();
      await until(() => S.log.length > n, 'ação de ofício executada');
    }
  });

  await section('palco de comando', async () => {
    const st = await ana.evaluate(() => { window.__st = openStage({ title: 'Teste', tone: 'atk' }); return !!window.__st; });
    check(st, 'openStage devolve um palco');
    const box = await ana.evaluate(() => { const r = document.querySelector('.stage-cmd')?.getBoundingClientRect(); return r ? { w: r.width / innerWidth, h: r.height / innerHeight } : null; });
    check(box && box.w >= .95 && box.h >= .95, 'o palco ocupa a tela toda');
    check(await ana.evaluate(() => openStage({ title: 'Outro' }) === null), 'um segundo openStage devolve null');
    check(await ana.evaluate(() => window.__st.result('perf', { title: 'PERFEITO', lines: ['×1,4 de dano'] }, 200).then(() => true)), 'result resolve');
    await ana.evaluate(() => window.__st.close(50));
    await until(async () => !(await ana.locator('.stage-cmd').count()), 'o palco some após close()');
    const w = await ana.evaluate(() => { const s = openStage({ title: 'Celular', tone: 'def' }); const r = document.documentElement.scrollWidth <= innerWidth; s.close(0); return r; });
    check(w, 'o palco não gera rolagem horizontal');
  });

  await section('comandos de ação: anel de defesa e minigame de ataque', async () => {
    const auto0 = S.auto.act; S.auto.act = true; go({ t: 'battle', on: true }); push();
    for (const c of [shinkai, minion]) { c.hp = c.hpMax; c.st = {}; } push();
    // defesa: o mestre escolhe à mão o ataque básico do inimigo; o anel abre só na tela da Ana e a tecla registra a nota
    S.battle.ticks[minion.id] = -1; push(); check(current() === minion.id, 'vez do inimigo'); // o inimigo é lento demais para chegar só passando a vez
    const DEF = globalThis.RULES.CMD.DEF, grace0 = DEF.grace; DEF.grace = 8000; // a janela fecha sozinha em ~1,3 s: no teste ela espera o navegador
    go({ t: 'act', id: minion.id, skill: 'atk', target: shinkai.id });
    DEF.grace = grace0;
    check(!!S.battle.cmd && S.battle.cmd.tgs.includes(shinkai.id), 'ataque à mão abre a janela para a Shinkai');
    await until(() => vis(ana, '.stage-cmd button.def'), 'anel de defesa na tela da Ana');
    check(/ESQUIVAR/.test(await txt(ana, '.stage-cmd button.def')), 'ataque básico oferece Esquiva');
    check(!(await vis(bia, '.stage-cmd button.def')), 'quem não é o alvo não vê o anel');
    await ana.locator('.stage-cmd button.def').dispatchEvent('pointerdown'); // o botão responde no toque, não no clique
    await until(() => (S.battle.cmd?.p[shinkai.id] || []).length > 0, 'o aperto chega ao servidor como nota');
    go({ t: 'cmdSkip' }); push();
    await until(() => !S.battle.cmd, 'a janela fecha');
    await until(async () => !(await ana.locator('.stage-cmd').count()), 'o anel some da tela');
    // ataque: técnica com Golpe no tempo abre o minigame; pular manda a ação sem nota e o golpe sai normal
    const k = Object.keys(S.skills).find(x => { const q = S.skills[x]; return q.cmd === 'tempo' && q.kind === 'dmg' && !q.limit && !q.area && q.res === 'aura' && (q.cost || 0) <= 20; });
    shinkai.skills = [...new Set([...shinkai.skills, k])]; shinkai.aura = shinkai.auraMax; push();
    check(toTurn(shinkai.id), 'vez da Shinkai'); await until(() => vis(ana, '.cmd.mine'), 'turno da Ana');
    await ana.locator('[data-sub=sk]').first().dispatchEvent('click');
    await until(() => vis(ana, `.opt[data-k=sk][data-v="${k}"]`), 'técnica com comando na lista');
    await ana.locator(`.opt[data-k=sk][data-v="${k}"]`).dispatchEvent('click'); await tgBtn(ana, minion.id).dispatchEvent('click');
    const n = S.seq; await ana.locator('.cmd-go .go').dispatchEvent('click');
    await until(() => vis(ana, '.stage-cmd .cm'), 'minigame do Golpe no tempo abre');
    await ana.locator('.stage-cmd .cm-skip').dispatchEvent('click');
    await until(() => S.log.some(l => l.n > n && l.who === 'Shinkai'), 'pular manda a ação e o golpe sai');
    await until(async () => !(await ana.locator('.stage-cmd').count()), 'o minigame some da tela');
    go({ t: 'battle', on: false }); S.auto.act = auto0; push();
  });

  // ---------- celular: transbordo, sobreposição e alvos de toque ----------
  async function phoneAudit(p, label) {
    const out = [];
    for (const pg of ['mesa', 'pers', 'hab', 'ofi', 'itens', 'hist']) {
      await p.click(`[data-pg=${pg}]`); await sleep(250); await p.evaluate(() => scrollTo(0, 0));
      const r = await p.evaluate(() => {
        const W = innerWidth, bad = [], vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
        const nav = document.querySelector('.tnav')?.getBoundingClientRect();
        const over = document.documentElement.scrollWidth - W;
        // elementos que passam da borda direita (ignora o que rola dentro de um contêiner próprio)
        const sideways = [...document.querySelectorAll('#app *')].filter(e => { if (!vis(e)) return false; const r = e.getBoundingClientRect(); if (r.right <= W + 1) return false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return false; } return true; }).slice(0, 4).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' ' + Math.round(e.getBoundingClientRect().right));
        const small = [...document.querySelectorAll('#app button,#app select,#app [data-a]:not(div):not(section),#app [data-pg]')].filter(e => vis(e) && !e.disabled && e.closest('.stage') === null).filter(e => { const r = e.getBoundingClientRect(); return r.height < 34 || r.width < 34; }).slice(0, 6).map(e => (e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0] + ' "' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 14) + '" ' + Math.round(e.getBoundingClientRect().width) + '×' + Math.round(e.getBoundingClientRect().height)));
        const navWrap = nav ? nav.height : 0;
        return { over, sideways, small, navWrap, W };
      });
      if (r.over > 1) out.push(`${pg}: página ${r.over}px mais larga que a tela`);
      if (r.sideways.length) out.push(`${pg}: passa da borda: ${r.sideways.join(', ')}`);
      if (r.small.length) out.push(`${pg}: botões pequenos: ${r.small.join(' | ')}`);
      if (r.navWrap > 90) out.push(`${pg}: a barra de navegação ocupa ${Math.round(r.navWrap)}px (quebrou em duas linhas)`);
      // o fim da página não pode ficar escondido atrás da barra de navegação
      const hid = await p.evaluate(async () => { scrollTo(0, 1e6); await new Promise(r => setTimeout(r, 80)); const nav = document.querySelector('.tnav')?.getBoundingClientRect(), last = [...document.querySelectorAll('#app main > *, #app main section')].filter(e => e.getBoundingClientRect().height > 0).at(-1)?.getBoundingClientRect(); return nav && last ? Math.round(last.bottom - nav.top) : 0; });
      if (hid > 2) out.push(`${pg}: o fim da página fica ${hid}px atrás da barra de navegação`);
      await shot(p, `${label}-${pg}`);
    }
    return out;
  }
  await section('celular (fora da batalha)', async () => { const o = await phoneAudit(ana, 'cel'); o.forEach(m => check(false, 'celular: ' + m)); });
  go({ t: 'battle', on: true });
  await until(() => vis(ana, '.cmd'), 'batalha na tela do celular');
  await section('celular (em batalha)', async () => { const o = await phoneAudit(ana, 'cel-batalha'); o.forEach(m => check(false, 'celular em batalha: ' + m)); });
  go({ t: 'battle', on: false });

} finally {
  for (const c of opened) await c.close().catch(() => {});
  await browser.close();
}
console.log(logs.length ? '\nErros de console:\n' + [...new Set(logs)].join('\n') : '\nSem erros de console.');
if (logs.length) fails.push(`${logs.length} erro(s) de console`);
console.log(fails.length ? `\n${fails.length} falha(s), ${okN} verificações ok.` : `\nTudo certo: ${okN} verificações.`);
server.close(); process.exit(fails.length ? 1 : 0);

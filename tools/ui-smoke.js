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
for (const f of foesOf()) { f.attrs.AGI = 1; f.hp = f.hpMax = 9999; } // inimigos lentos e duráveis: o roteiro controla o ritmo
H.weather(gmc, { k: Object.keys(globalThis.RULES.CLIMA)[0] });
push();

try {
  // ---------- telas abertas ----------
  const gmP = await open('gm', '/gm', { login: { p: 'chave' } });
  const ana = await open('ana', '/player', { login: { n: 'ana', p: '1234' }, phone: true });
  const bia = await open('bia', '/player', { login: { n: 'bia', p: '1234' } });
  const mesa = await open('mesa', '/table', { login: { n: 'mestre', p: 'chave' } });

  await section('exploração: telas sem batalha', async () => {
    for (const p of [gmP, ana, bia, mesa]) check((await p.locator('#app').innerText()).length > 50, `${p.who}: tela vazia`);
    await shot(gmP, 'explora'); await shot(ana, 'explora'); await shot(mesa, 'explora');
  });

  const go = m => handle(gmc, m); // mensagens do mestre direto no motor (montar o cenário); o que está sob teste vai pela tela
  const toTurn = id => { for (let i = 0; i < 60 && current() !== id; i++) go({ t: 'next' }); return current() === id; };
  const battleLog = () => S.log.map(l => l.text).join('\n');
  S.auto.act = true; // aprovar combate sozinho: o foco aqui é a tela do jogador; a fila de pedidos tem bloco próprio
  go({ t: 'battle', on: true });
  const tgBtn = (p, id) => p.locator(`.cmd .tg[data-tgt="${id}"]`);

  await section('batalha: tela do jogador abre no turno certo', async () => {
    await until(() => vis(ana, '.cmd'), 'comandos de batalha da Ana');
    check(current() === shinkai.id, 'Shinkai (AGI 95) deveria abrir a fila');
    check(await until(() => ana.locator('.cmd.mine').count(), 'turno da Ana destacado'), 'turno destacado');
    check(await ana.locator('.cmd-go .go').isEnabled() === false, 'Agir deveria estar desligado sem alvo');
    check(/aguarde/i.test(await txt(bia, '.cmd-go .go')), 'Bia deveria ver "Aguarde a sua vez"');
    await shot(ana, 'batalha'); await shot(bia, 'batalha'); await shot(mesa, 'batalha'); await shot(gmP, 'batalha');
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

  await section('Defender, Concentrar e Coragem', async () => {
    check(toTurn(shinkai.id), 'vez da Shinkai');
    await click(ana, '.rhythm [data-a=defend]', 'Defender');
    await until(() => shinkai.brv === 1, 'Coragem 1 após Defender');
    await until(async () => /Defender 1/i.test(await txt(ana, '.rhythm [data-a=defend]')), 'botão mostra Coragem 1');
    check(/Coragem 1/i.test(await txt(ana, '.rhythm [data-a=braveT]')), 'botão Coragem mostra 1 ponto');
    check(toTurn(shinkai.id), 'vez da Shinkai de novo');
    await click(ana, '.rhythm [data-a=focus]', 'Concentrar');
    await until(() => shinkai.ten === 1, 'Tensão 1');
    await until(async () => /×1.5/i.test(await txt(ana, '.rhythm [data-a=focus]')), 'botão mostra ×1.5');
    check(toTurn(shinkai.id), 'vez da Shinkai de novo (2)');
    // Coragem: liga, ataca e age de novo na sequência
    await tgBtn(ana, minion.id).click(); await click(ana, '.rhythm [data-a=braveT]', 'Coragem');
    check(await ana.locator('.rhythm [data-a=braveT]').getAttribute('aria-pressed') === 'true', 'Coragem deveria ficar ligada');
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
      await ana.selectOption('.rhythm select[data-a=passSel]', mikhail.id);
      await tgBtn(ana, minion.id).click();
      if (!i) check(await ana.locator('.rhythm select').inputValue() === mikhail.id, 'passar a vez: escolha deveria permanecer após clicar no alvo');
      const n = S.seq; await click(ana, '.cmd-go .go', 'Agir');
      await until(() => S.seq > n, 'ataque executado');
    }
    const brk0 = bossCh.brk?.cur;
    check(!!minion.st.down, 'inimigo fraco deveria ficar Derrubado');
    check(/passa a vez|Passar a Vez|entrega/i.test(battleLog()) || current() === mikhail.id, 'registro da passagem de vez');
    // chefe: barra de Quebra
    check(await vis(mesa, '.brk'), 'mesa: barra de Quebra do chefe ausente');
    check(/◆◆◆/.test(await txt(mesa, '.unit.foe .brk')), 'Quebra cheia no começo');
    for (let i = 0; i < 8 && !(bossCh.brk.cur < brk0 || bossCh.st.broken); i++) {
      check(toTurn(mikhail.id), 'vez da Mikhail'); await until(() => vis(bia, '.cmd.mine'), 'turno da Bia'); await tgBtn(bia, bossCh.id).click();
      const n = S.seq; await click(bia, '.cmd-go .go', 'Agir (Mikhail no chefe)'); await until(() => S.seq > n, 'ataque da Mikhail');
    }
    check(bossCh.brk.cur < brk0 || bossCh.st.broken, 'fraqueza no chefe deveria reduzir a Quebra');
    await until(async () => !/◆◆◆/.test(await txt(mesa, '.unit.foe .brk')) || /Quebrado/i.test(await mesa.locator('.unit.foe').first().innerText()), 'mesa mostra a Quebra reduzida');
    await shot(mesa, 'quebra');
    // Ataque Total: todo inimigo vivo Derrubado ou Quebrado
    for (const f of [bossCh, minion]) if (!f.st.down && !f.st.broken) go({ t: 'st', id: f.id, k: 'down' }); // o botão do mestre alterna a condição
    const hero = S.chars[current()], pg = hero.owner === 'ana' ? ana : bia;
    await until(async () => await pg.locator('.rhythm [data-a=allOut]').isEnabled(), 'Ataque Total liberado com todos Derrubados');
    const hp1 = bossCh.hp;
    await click(pg, '.rhythm [data-a=allOut]', 'Ataque Total');
    await until(() => /ATAQUE TOTAL|Ataque Total/i.test(battleLog()), 'registro do Ataque Total');
    await until(() => bossCh.hp < hp1, 'Ataque Total causou dano');
    await shot(pg, 'ataque-total');
  });

  go({ t: 'battle', on: false });
  S.auto.act = false; push();
  const onPage = async (p, sel) => { // abre as páginas do jogador até achar o elemento
    for (const pg of ['mesa', 'pers', 'hab', 'ofi', 'itens', 'hist']) { if (await p.locator(sel).count()) return true; await p.click(`[data-pg=${pg}]`).catch(() => {}); await sleep(120); }
    return (await p.locator(sel).count()) > 0;
  };

  await section('pedido de rolagem: aprovação com Vantagem e Desvantagem', async () => {
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
    gmP.once('dialog', d => d.accept('sem clima agora')); await click(gmP, '.rq [data-a=rqWhy]', 'Negar com motivo');
    await until(() => !Object.keys(S.reqs).length, 'pedido negado sai da fila');
    await shot(ana, 'rolagem'); await shot(gmP, 'pedidos');
  });

  await section('acampamento: conversar com alguém', async () => {
    go({ t: 'camp', on: true });
    ana.setViewportSize?.({ width: 390, height: 844 });
    check(await onPage(ana, '[data-a=campWith]'), 'seletor "Conversar com" não apareceu para a Ana');
    await click(ana, '[data-a=campAct][data-k=conversar]', 'ação Conversar');
    await until(() => Object.keys(S.reqs).length, 'pedido de acampamento (sem parceiro ainda)');
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

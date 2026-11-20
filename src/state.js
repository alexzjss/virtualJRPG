import { ITEMS_V, RENAME, buildItems, buildSkills, kitOf } from '../content.js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { SUBST } from '../arvore/substitutas.js';
import { DATA, FILE, OF } from './config.js';
import { ATTRS, BBG, BBHORAS, BBTEMAS, CLIMA, EL, EXTRA, it, sk } from './consts.js';


// ---------- estado ----------
let S = { chars: {}, log: [] }, fresh = true;
// Cenas com grupo dividido: cada cena guarda a própria batalha (sc.battle). S.scene e S.battle não são dados salvos, e sim ponteiros
// para a cena do contexto atual: a da ação em andamento (inScene) ou, fora dela, a cena em foco do mestre (S.focus). Assim as regras
// continuam lendo S.scene/S.battle sem saber que existem outras cenas. Os ponteiros não são enumeráveis: ficam fora do save e das cópias.
let CTX = null;
const BATTLE0 = () => ({ active: false, ticks: {} });
const ctxId = () => CTX && S.scenes?.[CTX] ? CTX : S.focus;
function pointers() {
  Object.defineProperty(S, 'scene', { configurable: true, enumerable: false, get: ctxId, set: v => { if (CTX) CTX = v; else S.focus = v; } });
  Object.defineProperty(S, 'battle', { configurable: true, enumerable: false,
    get: () => { const sc = S.scenes?.[ctxId()]; if (!sc) return BATTLE0(); if (!isObj(sc.battle)) sc.battle = BATTLE0(); return sc.battle; },
    set: v => { const sc = S.scenes?.[ctxId()]; if (sc) sc.battle = v; } });
}
// roda fn com S.scene/S.battle apontando para a cena id (null/inválida = cena em foco)
const inScene = (id, fn) => { const p = CTX; CTX = id ?? null; try { return fn(); } finally { CTX = p; } };
const ctxScene = () => ctxId();
// tira do objeto as chaves antigas battle/scene (saves de antes das cenas separadas) e devolve o que havia nelas
const takeLegacy = () => { const o = {}; for (const k of ['battle', 'scene']) { const d = Object.getOwnPropertyDescriptor(S, k); if (d) { if ('value' in d) o[k] = d.value; delete S[k]; } } return o; };
const BK = path.join(DATA, 'backups');
const writeState = () => { fs.mkdirSync(DATA, { recursive: true }); const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(S)); fs.renameSync(tmp, FILE); flushDiary(); }; // grava num temporário e troca: uma queda no meio não corrompe o estado
{
  let raw = null; try { raw = fs.readFileSync(FILE); } catch (e) { if (e.code !== 'ENOENT') throw e; } // sem arquivo = campanha nova
  if (raw) {
    try { S = JSON.parse(raw); fresh = false; }
    catch { // arquivo corrompido: guarda uma cópia, volta ao backup mais recente que abre e recusa subir se não houver nenhum
      const bad = path.join(DATA, `state-corrompido-${Date.now()}.json`); fs.renameSync(FILE, bad);
      const files = fs.existsSync(BK) ? fs.readdirSync(BK).sort().reverse() : [];
      for (const f of files) { try { S = JSON.parse(fs.readFileSync(path.join(BK, f))); fresh = false; console.error(`\n  state.json estava corrompido. Restaurado do backup ${f}. A cópia ruim ficou em ${bad}\n`); writeState(); break; } catch {} }
      if (fresh) throw new Error(`state.json está corrompido e não há backup utilizável. O arquivo foi guardado em ${bad}; recupere-o à mão ou apague-o para começar uma campanha nova.`);
    }
  }
}
const newScene = (name, o = {}) => ({ name, cols: 20, rows: 12, ar: 20 / 12, crop: { x: 0, y: 0, w: 1, h: 1 }, ox: 0, oy: 0, cam: null, bg: '', fogOn: false, seen: {}, shop: { open: false, stock: [] }, ...o });
function migrateA(lg = {}) {
if (!S.scenes) { S.scenes = { a: newScene('Cena 1', S.map) }; S.focus = 'a'; delete S.map; }
if (!Object.hasOwn(S.scenes, S.focus)) S.focus = Object.hasOwn(S.scenes, lg.scene) ? lg.scene : Object.keys(S.scenes)[0];
if (isObj(lg.battle) && !isObj(S.scenes[S.focus].battle)) S.scenes[S.focus].battle = lg.battle; // a batalha única antiga fica na cena que era a atual
pointers();
{
  const built = buildSkills(sk), sig = crypto.createHash('sha1').update(JSON.stringify(built)).digest('hex');
  if (S.skills && S.skillsSig !== sig) {
    // skills criadas pelo mestre (fora da árvore e com nome que ela não tem) continuam, com o mesmo id
    { const names = new Set(Object.values(built).map(s => s.name)); for (const [k, s] of Object.entries(S.skills)) if (!/^g\d+$/.test(k) && s && !names.has(s.name)) built[k] = s; }
    const byName = Object.fromEntries(Object.entries(built).map(([k, s]) => [s.name, k])), old = S.skills; let lost = 0;
    for (const ch of [...Object.values(S.chars), ...Object.values(S.bestiary || {})]) {
      const keep = [];
      for (const k of ch.skills || []) { const nk = byName[old[k]?.name] || byName[SUBST(old[k]?.name)]; if (nk && !keep.includes(nk)) keep.push(nk); else if (nk) { if (!ch.enemy) ch.xp = (ch.xp || 0) + (old[k]?.xp || 0); } else { lost++; if (!ch.enemy) ch.xp = (ch.xp || 0) + (old[k]?.xp || 0); } }
      ch.skills = [...new Set(keep)];
    }
    S.log.push({ n: S.seq = (S.seq || 0) + 1, who: 'Sistema', text: `Árvore de habilidades atualizada. Skills aprendidas foram mantidas pelo nome${lost ? `; ${lost} que deixaram de existir devolveram o XP.` : '.'}`, kind: 'ok' });
    S.skills = built;
  }
  S.skills ??= built; S.skillsSig = sig;
}
S.items ??= buildItems(it);
}
// Preserva mapas e URLs personalizados ao abrir campanhas do catálogo anterior.
function migrateBackdrop(sc) {
  if (!/^[a-z]+(?:-[a-z]+)*$/.test(sc.bbg || '')) return;
  if (BBG.includes(sc.bbg)) return; // tema e horário válidos
  const family = sc.bbg.split('-')[0];
  sc.bbg = BBTEMAS.includes(family) ? family + '-' + BBHORAS[0] : 'floresta-dia';
}
function migrateItems() { // catálogo v5: nomes novos dos consumáveis e equipamentos (RENAME) e o catálogo completo de armas com modelo (armas forjadas e itens do mestre ficam); as chaves mudam, então tudo é remapeado pelo nome
  if (S.itemsV === ITEMS_V) return;
  const old = S.items, fresh = buildItems(it), byName = n => Object.keys(fresh).find(k => fresh[k].name === n), map = {};
  for (const [k, i] of Object.entries(old)) {
    if (i.type === 'arma' && byName(i.name) && !i.tpl) { map[k] = byName(i.name); continue; } // arma do catálogo: vale a versão atual dele
    const nn = RENAME[i.name] || i.name, nk = byName(nn) || 'x' + k; map[k] = nk; fresh[nk] = { ...i, name: nn }; // o nome novo vale; o resto (preço, poder) fica como o mestre deixou // mantém edições do mestre e itens criados por ele
  }
  S.items = fresh;
  const tr = k => map[k] ?? (fresh[k] ? k : null);
  for (const ch of Object.values(S.chars)) {
    const inv = {}; for (const [k, n] of Object.entries(ch.inv || {})) { const nk = tr(k); if (nk) inv[nk] = (inv[nk] || 0) + n; } ch.inv = inv;
    for (const sl of Object.keys(ch.equip || {})) { const nk = tr(ch.equip[sl]); if (nk) ch.equip[sl] = nk; else delete ch.equip[sl]; }
  }
  for (const sc of Object.values(S.scenes)) if (sc.shop) sc.shop.stock = [...new Set(sc.shop.stock.map(tr).filter(k => k && fresh[k]))];
  S.itemsV = ITEMS_V;
}

function migrateB(isNew) {
for (const s of Object.values(S.skills)) { s.req ??= ''; s.back ??= ''; s.ex ??= ''; s.d ??= ''; s.rq ??= null; }
for (const i of Object.values(S.items)) { i.wt ??= ''; i.el ??= ''; if (i.kit === undefined && kitOf(i.name)) i.kit = kitOf(i.name); } // kit: tag que cumpre o reqItem das técnicas (o que o mestre já editou fica)
Object.assign(S, { encounters: {}, camp: { open: false, acts: {} }, seq: 0, users: {}, bestiary: {}, contracts: {}, ...S });
S.ofiCfg ??= {}; OF.apply(S.ofiCfg); // catálogo de ofícios editado pelo mestre (só as diferenças), mesclado sobre public/oficios.js
S.reqs ??= {}; S.auto = { roll: false, act: false, learn: false, item: false, camp: false, pass: false, inter: false, ...S.auto }; // pedidos dos jogadores à espera do mestre e o que ele liberou sem aprovação
if (S.accV !== 2) { S.users = {}; S.accV = 2; } // contas antigas (criadas no primeiro acesso) são apagadas: agora só o mestre cria contas
for (const sc of Object.values(S.scenes)) { sc.shop ??= { open: false, stock: [] }; sc.ar ??= sc.cols / sc.rows; sc.crop ??= { x: 0, y: 0, w: 1, h: 1 }; sc.ox ??= 0; sc.oy ??= 0; sc.cam ??= null; sc.bbg ??= ''; migrateBackdrop(sc); sc.clima ??= ''; sc.gather ??= []; }
if (S.shop) { S.scenes[S.focus].shop = S.shop; delete S.shop; } // a loja única antiga vira a loja da cena atual
if (isNew) S.itemsV = ITEMS_V; else migrateItems();
fixShape();
for (const ch of Object.values(S.chars)) Object.assign(ch, { scene: S.focus, ...structuredClone(EXTRA), arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {}, gold: 0, img: '', imgF: '', imgB: '', imgP: '', imgK: {}, fxK: {}, imgS: 1, ...ch });
for (const [id, ch] of Object.entries(S.chars)) fixChar(ch, id, true);
for (const [id, b] of Object.entries(S.bestiary)) { Object.assign(b, { ...structuredClone(EXTRA), arma: 8, armor: 0, imgF: '', imgB: '', imgP: '', imgK: {}, fxK: {}, imgS: 1, ...b, enemy: true }); fixChar(b, id, false); }
}
// ---------- saneamento: um arquivo editado à mão, antigo ou importado nunca deixa o estado num formato que derrube o servidor ----------
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const fin = (v, d = 0) => v !== null && v !== '' && typeof v !== 'boolean' && Number.isFinite(+v) ? +v : d;
function preFix() { // antes das migrações: coleções que não são objetos de objetos são descartadas (as que têm padrão são recriadas)
  if (S.skills && JSON.stringify(S).includes('radiacao')) { const o = JSON.parse(JSON.stringify(S).replace(/radiacao/g, 'hiruko')); for (const k of Object.keys(S)) delete S[k]; Object.assign(S, o); } // id antigo do Vínculo de Hiruko: converte fichas, itens e a grade salvas
  for (const k of ['chars', 'scenes', 'bestiary', 'skills', 'items', 'encounters', 'contracts']) {
    if (S[k] === undefined) continue;
    if (!isObj(S[k])) { delete S[k]; continue; }
    for (const [id, v] of Object.entries(S[k])) if (!isObj(v)) delete S[k][id];
  }
  if (!isObj(S.chars)) S.chars = {};
  if (isObj(S.scenes) && !Object.keys(S.scenes).length) delete S.scenes;
  if (!Array.isArray(S.log)) S.log = [];
  S.log = S.log.filter(isObj).slice(-150); S.seq = Math.max(0, Math.round(fin(S.seq)));
}
function fixShape() {
  for (const k of ['reqs', 'users']) if (!isObj(S[k])) S[k] = {};
  if (S.ui !== 'pincel') S.ui = '';
  if (!Object.hasOwn(S.scenes, S.tv)) S.tv = S.focus;
  S.offMsg = String(S.offMsg ?? '').slice(0, 300);
  S.paused = !!S.paused;
  if (!isObj(S.camp)) S.camp = { open: false, acts: {} };
  if (!isObj(S.camp.acts)) S.camp.acts = {};
  for (const [sid, sc] of Object.entries(S.scenes)) {
    const base = newScene('?');
    sc.name = String(sc.name ?? '?').slice(0, 30) || '?';
    sc.cols = Math.min(80, Math.max(4, fin(sc.cols, 20))); sc.ar = Math.min(6, Math.max(.2, fin(sc.ar, sc.cols / Math.max(1, fin(sc.rows, 12))))); sc.rows = Math.max(1, fin(sc.rows, Math.round(sc.cols / sc.ar * 1000) / 1000));
    sc.ox = Math.min(.95, Math.max(0, fin(sc.ox))); sc.oy = Math.min(.95, Math.max(0, fin(sc.oy)));
    if (!isObj(sc.crop) || !['x', 'y', 'w', 'h'].every(k => Number.isFinite(sc.crop[k]))) sc.crop = base.crop;
    if (!isObj(sc.seen)) sc.seen = {};
    if (!isObj(sc.shop)) sc.shop = base.shop;
    if (!Array.isArray(sc.shop.stock)) sc.shop.stock = [];
    sc.shop.open = !!sc.shop.open;
    if (sc.cam !== null && !isObj(sc.cam)) sc.cam = null;
    for (const k of ['bg', 'bbg']) if (typeof sc[k] !== 'string') sc[k] = ''; migrateBackdrop(sc); if (!CLIMA.includes(sc.clima)) sc.clima = '';
    sc.fogOn = !!sc.fogOn;
    if (!isObj(sc.battle)) sc.battle = BATTLE0();
    const B = sc.battle; if (!isObj(B.ticks)) B.ticks = {};
    for (const [id, t] of Object.entries(B.ticks)) if (!Number.isFinite(t) || !S.chars[id]) delete B.ticks[id];
    if (isObj(B.ordTies)) {
      for (const [tick, tie] of Object.entries(B.ordTies)) {
        if (!Number.isFinite(+tick) || !Array.isArray(tie?.ids) || !Array.isArray(tie.moved)) delete B.ordTies[tick];
      }
    } else delete B.ordTies;
    B.active = !!B.active;
    if (!B.active) delete B.seed;
    else if (!Number.isInteger(B.seed) || B.seed < 1 || B.seed >= 2 ** 31) B.seed = crypto.randomInt(1, 2 ** 31);
    sc.enc = Array.isArray(sc.enc) ? [...new Set(sc.enc.filter(k => typeof k === 'string' && Object.hasOwn(S.encounters || {}, k)))] : [];
    sc.exits = Array.isArray(sc.exits) ? sc.exits.filter(e => isObj(e) && Object.hasOwn(S.scenes, e.to) && e.to !== sid).map(e => ({ id: String(e.id || Math.random().toString(36).slice(2, 8)), x: Math.max(0, Math.round(fin(e.x))), y: Math.max(0, Math.round(fin(e.y))), to: e.to })) : [];
  }
  if (S.chase && !(isObj(S.chase) && isObj(S.chase.a) && isObj(S.chase.b))) S.chase = null;
}
function fixChar(ch, id, live) {
  const arr = (k, ok) => { ch[k] = Array.isArray(ch[k]) ? [...new Set(ch[k].filter(ok))] : []; }, obj = k => { if (!isObj(ch[k])) ch[k] = {}; }, str = v => typeof v === 'string';
  ch.id = id; ch.enemy = !!ch.enemy; ch.name = String(ch.name ?? '?').slice(0, 30) || '?'; ch.owner = ch.enemy ? '' : String(ch.owner ?? '').slice(0, 30);
  if (!/^#[0-9a-f]{6}$/i.test(ch.color)) ch.color = ch.enemy ? '#e60012' : '#00b7ff';
  for (const k of ['img', 'imgF', 'imgB', 'imgP']) if (!str(ch[k])) ch[k] = '';
  ch.imgS = Math.min(2.5, Math.max(0.5, fin(ch.imgS, 1))); if (!isObj(ch.imgK)) ch.imgK = {}; if (!isObj(ch.fxK)) ch.fxK = {};
  for (const k of Object.keys(ch.fxK)) if (!['f', 'b'].includes(k)) delete ch.fxK[k];
  for (const k of ['f', 'b']) { if (!isObj(ch.fxK[k])) { delete ch.fxK[k]; continue; } for (const a of Object.keys(ch.fxK[k])) { const p = ch.fxK[k][a]; if (!['hand', 'weapon', 'head', 'feet', 'core', 'eyes'].includes(a) || !isObj(p)) delete ch.fxK[k][a]; else ch.fxK[k][a] = { x: Math.min(1, Math.max(0, fin(p.x, .5))), y: Math.min(1, Math.max(0, fin(p.y, .5))) }; } }
  const at = isObj(ch.attrs) ? ch.attrs : {}; ch.attrs = Object.fromEntries(ATTRS.map(a => [a, Math.min(100, Math.max(1, Math.round(fin(at[a], ch.enemy ? 50 : 40))))]));
  arr('weak', e => EL.includes(e)); arr('resist', e => EL.includes(e)); arr('vinc', e => EL.includes(e)); arr('skills', str); arr('skPin', str); ch.skPin = ch.skPin.slice(0, 6);
  ch.skUse = isObj(ch.skUse) ? Object.fromEntries(Object.entries(ch.skUse).filter(([, n]) => Number.isInteger(n) && n > 0)) : {};
  ['st', 'inv', 'equip', 'marks', 'body', 'bon'].forEach(obj);
  for (const k of ['hpMax', 'auraMax', 'sanMax']) ch.bon[k] = Math.round(fin(ch.bon[k]));
  for (const [k, n] of Object.entries(ch.inv)) { if (fin(n) > 0) ch.inv[k] = Math.round(fin(n)); else delete ch.inv[k]; }
  for (const [k, n] of Object.entries(ch.st)) if (!Number.isFinite(n)) delete ch.st[k];
  for (const [k, n] of Object.entries(ch.body)) ch.body[k] = Math.max(0, fin(n));
  for (const [k, v] of Object.entries(ch.equip)) if (!str(v)) delete ch.equip[k];
  for (const k of ['hp', 'aura', 'san', 'xp', 'gold', 'xpR', 'goldR', 'arma', 'armor']) ch[k] = Math.max(0, Math.round(fin(ch[k])));
  ch.limit = Math.min(100, Math.max(0, Math.round(fin(ch.limit))));
  for (const k of ['x', 'y']) ch[k] = ch[k] == null ? null : Math.max(0, Math.round(fin(ch[k])));
  for (const k of ['bio', 'gmNote']) ch[k] = String(ch[k] ?? '').slice(0, 3000);
  if (live && !(ch.scene === null && !ch.enemy) && !Object.hasOwn(S.scenes, ch.scene)) ch.scene = S.focus; // herói com cena null está fora de cena
}
// aplica todas as migrações ao estado atual (ao abrir, ao trocar de campanha, ao restaurar um backup)
const MIG = []; // passos de migração registrados por outros módulos (ex.: src/mundo.js), rodados a cada abertura de campanha
const migrate = isNew => { const lg = takeLegacy(); preFix(); migrateA(lg); migrateB(isNew); MIG.forEach(f => f()); };
migrate(fresh);
let saveT = null;
const flush = () => { if (!saveT) return; clearTimeout(saveT); saveT = null; try { writeState(); } catch (e) { console.error('Falha ao salvar:', e.message); } };
const save = () => { clearTimeout(saveT); saveT = setTimeout(flush, 300); };
process.on('exit', flush); // não perde o que ainda esperava para ser gravado ao fechar
// Ctrl+C, fechar a janela do console (SIGHUP no Windows) ou encerrar o processo: grava antes de sair. Sem isto o Node sai sem passar pelo 'exit'.
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { flush(); process.exit(0); });
// entradas de batalha ganham a cena (sc): o jogador de outra cena não as recebe. Chat e narração fora de batalha continuam para todos.
const log = (who, text, kind = '', x = {}) => { if (CTX && !x.to && !x.sc && S.scenes?.[CTX]?.battle?.active) x = { ...x, sc: CTX }; if (!x.to) diary.push({ t: Date.now(), who, text, kind }), diary.length > 3000 && diary.shift(); S.log.push({ n: ++S.seq, ts: Date.now(), who, text, kind, ...x }); if (S.log.length > 150) S.log.shift(); };
// ---------- diário, backups e troca de campanha ----------
const slug = n => String(n || 'campanha').normalize('NFD').replace(/[^\w -]/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 40) || 'campanha';
// diário: tudo o que é público no histórico vai para um arquivo por campanha, sem o limite de 150 linhas do chat
const diary = [], diaryFile = () => path.join(DATA, 'diario', slug(S.title) + '.jsonl');
const flushDiary = () => { if (!diary.length) return; try { fs.mkdirSync(path.join(DATA, 'diario'), { recursive: true }); fs.appendFileSync(diaryFile(), diary.splice(0).map(e => JSON.stringify(e)).join('\n') + '\n'); } catch (e) { console.error('Falha ao gravar o diário:', e.message); } };
// cópia de segurança com etiqueta (inicio, auto, manual, antes-de-…); mantém as 30 mais recentes
function backup(tag = 'auto') {
  fs.mkdirSync(BK, { recursive: true });
  let t = Date.now(); const name = () => `state-${new Date(t).toISOString().replace(/[:.]/g, '-')}-${slug(tag)}.json`; while (fs.existsSync(path.join(BK, name()))) t++; // duas cópias no mesmo milissegundo não se sobrescrevem
  const f = name();
  fs.writeFileSync(path.join(BK, f), JSON.stringify(S));
  fs.readdirSync(BK).filter(x => x.endsWith('.json')).sort().slice(0, -30).forEach(x => fs.unlinkSync(path.join(BK, x)));
  return f;
}
function backupOnStart() { if (!fresh) backup('inicio'); }
const BLANK = () => ({ chars: {}, log: [] });
// troca o conteúdo do estado sem trocar o objeto (os outros módulos guardam a referência); as contas dos jogadores são mantidas
// Se o conteúdo novo não puder ser aberto, o estado anterior volta inteiro (o que estava em uso nunca fica pela metade).
// after: passos que o chamador ainda precisa dar sobre o estado novo (sementes, valores padrão, conferência) dentro da mesma garantia.
function adopt(o, isNew = false, after = () => {}) {
  if (!isObj(o) || (!isNew && !isObj(o.chars))) throw new Error('Arquivo de campanha inválido.');
  flushDiary(); const prev = { ...S }, users = S.users, accV = S.accV;
  try {
    for (const k of Object.keys(S)) delete S[k];
    delete S.scene; delete S.battle; CTX = null; // sem os ponteiros: as chaves battle/scene de um save antigo entram como dados e a migração as converte
    Object.assign(S, structuredClone(o), { accV }); S.log ??= [];
    migrate(isNew); S.users = { ...S.users, ...users };
    after();
  } catch (e) {
    for (const k of Object.keys(S)) delete S[k];
    delete S.scene; delete S.battle;
    Object.assign(S, prev); pointers();
    throw new Error('Não foi possível abrir esta campanha (' + (e.message || e) + '). Nada foi alterado.');
  }
}

export { BK, BLANK, MIG, S, inScene, migrateBackdrop, ctxScene, adopt, backup, backupOnStart, diaryFile, fin, flush, flushDiary, fresh, isObj, log, migrate, migrateItems, newScene, save, saveT, slug, writeState };

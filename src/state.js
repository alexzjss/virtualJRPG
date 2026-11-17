import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildSkills, buildItems, ITEMS_V, RENAME } from '../content.js';
import { DATA, FILE } from './config.js';
import { EXTRA, sk, it } from './consts.js';

// ---------- estado ----------
let S = { chars: {}, battle: { active: false, ticks: {} }, log: [] }, fresh = true;
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
function migrateA() {
if (!S.scenes) { S.scenes = { a: newScene('Cena 1', S.map) }; S.scene = 'a'; delete S.map; }
{
  const built = buildSkills(sk), sig = crypto.createHash('sha1').update(JSON.stringify(built)).digest('hex');
  if (S.skills && S.skillsSig !== sig) {
    const byName = Object.fromEntries(Object.entries(built).map(([k, s]) => [s.name, k])), old = S.skills; let lost = 0;
    for (const ch of [...Object.values(S.chars), ...Object.values(S.bestiary || {})]) {
      const keep = [];
      for (const k of ch.skills || []) { const nk = byName[old[k]?.name]; if (nk) keep.push(nk); else { lost++; if (!ch.enemy) ch.xp = (ch.xp || 0) + (old[k]?.xp || 0); } }
      ch.skills = [...new Set(keep)];
    }
    S.log.push({ n: S.seq = (S.seq || 0) + 1, who: 'Sistema', text: `Árvore de habilidades atualizada. Skills aprendidas foram mantidas pelo nome${lost ? `; ${lost} que deixaram de existir devolveram o XP.` : '.'}`, kind: 'ok' });
    S.skills = built;
  }
  S.skills ??= built; S.skillsSig = sig;
}
S.items ??= buildItems(it);
}
function migrateItems() { // catálogo v3 (armas e itens da campanha); as chaves mudam, então tudo é remapeado pelo nome
  if (S.itemsV === ITEMS_V) return;
  const old = S.items, fresh = buildItems(it), byName = n => Object.keys(fresh).find(k => fresh[k].name === n), flo = byName('Florete'), map = {};
  for (const [k, i] of Object.entries(old)) {
    if (i.type === 'arma') { map[k] = byName(i.name) || flo; continue; } // arma que não existe mais vira Florete
    const nk = byName(RENAME[i.name] || i.name) || 'x' + k; map[k] = nk; fresh[nk] = { ...i }; // mantém edições do mestre e itens criados por ele
  }
  S.items = fresh;
  const tr = k => map[k] ?? (fresh[k] ? k : null);
  for (const ch of Object.values(S.chars)) {
    const inv = {}; for (const [k, n] of Object.entries(ch.inv || {})) { const nk = tr(k); if (nk) inv[nk] = (inv[nk] || 0) + n; } ch.inv = inv;
    for (const sl of Object.keys(ch.equip || {})) { const nk = tr(ch.equip[sl]); if (nk) ch.equip[sl] = nk; else delete ch.equip[sl]; }
  }
  for (const sc of Object.values(S.scenes)) if (sc.shop) sc.shop.stock = [...new Set(sc.shop.stock.map(tr).filter(k => k && fresh[k].type !== 'arma'))];
  S.itemsV = ITEMS_V;
}
function migrateB(isNew) {
for (const s of Object.values(S.skills)) { s.req ??= ''; s.back ??= ''; s.ex ??= ''; s.d ??= ''; s.rq ??= null; }
for (const i of Object.values(S.items)) { i.wt ??= ''; i.el ??= ''; i.pierce ??= 0; i.reqFor ??= 0; i.grant ??= null; }
Object.assign(S, { encounters: {}, camp: { open: false, acts: {} }, seq: 0, users: {}, bestiary: {}, contracts: {}, ...S });
S.reqs ??= {}; S.auto = { roll: false, act: false, learn: false, item: false, camp: false, ...S.auto }; // pedidos dos jogadores à espera do mestre e o que ele liberou sem aprovação
if (S.accV !== 2) { S.users = {}; S.accV = 2; } // contas antigas (criadas no primeiro acesso) são apagadas: agora só o mestre cria contas
for (const sc of Object.values(S.scenes)) { sc.shop ??= { open: false, stock: [] }; sc.ar ??= sc.cols / sc.rows; sc.crop ??= { x: 0, y: 0, w: 1, h: 1 }; sc.ox ??= 0; sc.oy ??= 0; sc.cam ??= null; sc.bbg ??= ''; }
if (S.shop) { S.scenes[S.scene].shop = S.shop; delete S.shop; } // a loja única antiga vira a loja da cena atual
if (isNew) S.itemsV = ITEMS_V; else migrateItems();
for (const ch of Object.values(S.chars)) Object.assign(ch, { scene: S.scene, ...structuredClone(EXTRA), arma: 8, armor: 0, weak: [], resist: [], skills: [], st: {}, inv: {}, equip: {}, gold: 0, img: '', ...ch });
}
// aplica todas as migrações ao estado atual (ao abrir, ao trocar de campanha, ao restaurar um backup)
const migrate = isNew => { migrateA(); migrateB(isNew); };
migrate(fresh);
let saveT = null;
const flush = () => { if (!saveT) return; clearTimeout(saveT); saveT = null; try { writeState(); } catch (e) { console.error('Falha ao salvar:', e.message); } };
const save = () => { clearTimeout(saveT); saveT = setTimeout(flush, 300); };
process.on('exit', flush); // não perde o que ainda esperava para ser gravado ao fechar
const log = (who, text, kind = '', x = {}) => { if (!x.to) diary.push({ t: Date.now(), who, text, kind }), diary.length > 3000 && diary.shift(); S.log.push({ n: ++S.seq, who, text, kind, ...x }); if (S.log.length > 150) S.log.shift(); };
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
const BLANK = () => ({ chars: {}, battle: { active: false, ticks: {} }, log: [] });
// troca o conteúdo do estado sem trocar o objeto (os outros módulos guardam a referência); as contas dos jogadores são mantidas
function adopt(o, isNew = false) {
  if (!o || typeof o !== 'object' || Array.isArray(o) || (!isNew && (typeof o.chars !== 'object' || !o.chars))) throw new Error('Arquivo de campanha inválido.');
  flushDiary(); const users = S.users, accV = S.accV;
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, structuredClone(o), { accV }); S.log ??= []; S.battle ??= { active: false, ticks: {} };
  migrate(isNew); S.users = { ...S.users, ...users };
}

export { S, fresh, BK, writeState, newScene, migrateItems, saveT, flush, save, log, backupOnStart, migrate, adopt, backup, slug, diaryFile, flushDiary, BLANK };

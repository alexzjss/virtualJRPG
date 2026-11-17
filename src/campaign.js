import path from 'path';
import fs from 'fs';
import { DATA, GM, KEY } from './config.js';
import { BK, BLANK, S, adopt, backup, diaryFile, flushDiary, log, slug } from './state.js';
import { fixMedia } from './media.js';
import { seed } from './seed.js';
import { int, newChar, okUrl, prep, rid } from './rules.js';
import { H, NOUNDO, undoStack } from './handlers.js';
import { ATTRS, BBG, EL, ITYPES, NEW, PARTS, R, SCH, STK, TIER } from './consts.js';
import { blocked, ipOf, penalize, same } from './auth.js';
import { hooks, push } from './net.js';


const CAMPS = path.join(DATA, 'campanhas');
const jsons = d => { try { return fs.readdirSync(d).filter(f => f.endsWith('.json')).sort(); } catch { return []; } };
const safe = f => typeof f === 'string' && /^[\w.-]+$/.test(f) && !f.includes('..');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
// só o mestre; um erro (arquivo ruim, disco cheio) volta como aviso na tela dele em vez de derrubar a ação em silêncio
const gm = fn => (c, m) => { if (c.role !== 'gm') return; try { fn(c, m); } catch (e) { console.error(e); c.send?.(JSON.stringify({ t: 'err', msg: e.message || String(e) })); } };

// o que o painel do mestre lista: campanhas guardadas e cópias de segurança (relido só quando algo muda)
let store = null;
const storeInfo = () => store ??= { camps: jsons(CAMPS).map(f => f.slice(0, -5)), backups: jsons(BK).reverse() };
const touch = () => { store = null; };
// valores que este módulo e o de mídia esperam encontrar no estado, qualquer que seja a origem dele
const fix = () => { S.title = String(S.title || 'Campanha').slice(0, 40); S.v = 3; fixMedia(); };
fix();

function saveSlot() { // guarda a campanha atual em data/campanhas/<nome>.json
  fs.mkdirSync(CAMPS, { recursive: true });
  const f = path.join(CAMPS, slug(S.title) + '.json'), tmp = f + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(S)); fs.renameSync(tmp, f); touch();
}
function swap(o, isNew = false) { // troca a campanha em uso, sempre com uma cópia de segurança antes; se a nova não abrir, a atual continua intacta
  backup('antes-de-trocar'); adopt(o, isNew, () => { if (isNew) seed(); fix(); prep(); }); undoStack.length = 0; touch();
}
// campanha vinda de um arquivo de fora: só passam chaves simples, definições no esquema e um histórico limpo
const okKey = k => /^[\w-]{1,32}$/.test(k), KINDS_LOG = ['', 'ok', 'bad', 'chat'];
function cleanCampaign(o) {
  const str = (v, n) => String(v ?? '').slice(0, n);
  for (const k of ['chars', 'scenes', 'bestiary', 'skills', 'items', 'encounters', 'contracts', 'tracks']) if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) o[k] = Object.fromEntries(Object.entries(o[k]).filter(([id, v]) => okKey(id) && v && typeof v === 'object'));
  for (const coll of ['skills', 'items']) if (o[coll]) for (const [id, d] of Object.entries(o[coll])) o[coll][id] = cleanDef(coll, d);
  for (const ch of [...Object.values(o.chars || {}), ...Object.values(o.bestiary || {})]) {
    if (!okUrl(ch.img)) ch.img = '';
    ch.cat = ['demonio', 'humano', 'chefe'].includes(ch.cat) ? ch.cat : undefined; ch.tpl = ch.tpl == null ? undefined : str(ch.tpl, 40);
    if (ch.st && typeof ch.st === 'object') ch.st = Object.fromEntries(Object.entries(ch.st).filter(([k]) => STK.includes(k)));
    if (!PARTS.includes(ch.weakPart)) delete ch.weakPart;
  }
  for (const sc of Object.values(o.scenes || {})) {
    for (const k of ['bg', 'music']) if (!okUrl(sc[k])) sc[k] = '';
    if (!BBG.includes(sc.bbg) && !okUrl(sc.bbg)) sc.bbg = '';
    sc.note = str(sc.note, 3000);
    sc.pins = sc.pins && typeof sc.pins === 'object' ? Object.fromEntries(Object.entries(sc.pins).filter(([id, p]) => okKey(id) && p && typeof p === 'object').map(([id, p]) => [id, { x: int(p.x, 0, 99), y: int(p.y, 0, 99), text: str(p.text, 60), gm: !!p.gm }])) : {};
  }
  for (const [id, t] of Object.entries(o.tracks || {})) { if (okUrl(t.url)) o.tracks[id] = { name: str(t.name, 40), url: t.url }; else delete o.tracks[id]; }
  if (o.audio && typeof o.audio === 'object') { if (!okUrl(o.audio.url)) { o.audio.url = ''; o.audio.on = false; } } else delete o.audio;
  o.log = (Array.isArray(o.log) ? o.log : []).filter(e => e && typeof e === 'object').slice(-150).map(e => ({ n: int(e.n, 0, 1e9), who: str(e.who, 40), text: str(e.text, 600), kind: KINDS_LOG.includes(e.kind) ? e.kind : '',
    ...(Number.isFinite(e.d) ? { d: int(e.d, 0, 100) } : {}), ...(typeof e.to === 'string' ? { to: str(e.to, 30) } : {}), ...(typeof e.from === 'string' ? { from: str(e.from, 30) } : {}) }));
  o.title = str(o.title || 'Campanha', 40); o.reqs = {}; o.handout = null; delete o.users; delete o.vj;
  if (o.chase) o.chase = null;
  return o;
}

// ---------- pacote de conteúdo: skills, itens, bestiário e encontros num arquivo, para levar de uma campanha a outra ----------
const coerce = (r, v, old) => r === 't' ? String(v ?? '').slice(0, 160) : r === 's' ? String(v ?? '').slice(0, 40) || '?' : r === 'n' ? int(v, 0, 999) : r === 'g' ? int(v, 0, 200)
  : r === 'p' ? Math.min(1, Math.max(0, Math.round((+v || 0) * 100) / 100)) : r === 'b' ? !!v : r.includes(v) ? v : old;
function cleanDef(coll, o) { // só passam os campos do esquema, já no tipo certo
  const base = NEW[coll](); if (!o || typeof o !== 'object') return base;
  for (const [f, r] of Object.entries(SCH[coll])) if (f in o) base[f] = coerce(r, o[f], base[f]);
  if (coll === 'skills') { if (o.root) base.root = true; if (o.rq && typeof o.rq === 'object') base.rq = Object.fromEntries(Object.entries(o.rq).filter(([a]) => ATTRS.includes(a)).map(([a, v]) => [a, int(v, 0, 100)])); }
  else if (o.grant && typeof o.grant === 'object') base.grant = { ...cleanDef('skills', o.grant), reqFor: int(o.grant.reqFor, 0, 100) };
  return base;
}
function cleanFoe(o, map) {
  const ch = newChar('', true, ''), str = (v, n) => String(v ?? '').slice(0, n), els = a => Array.isArray(a) ? [...new Set(a.filter(e => EL.includes(e)))] : [];
  Object.assign(ch, { name: str(o.name, 30) || '?', color: /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : ch.color, img: okUrl(o.img) ? o.img : '', weak: els(o.weak), resist: els(o.resist), vinc: els(o.vinc),
    skills: [...new Set((Array.isArray(o.skills) ? o.skills : []).map(k => map.skills[k]).filter(Boolean))], xpR: int(o.xpR), goldR: int(o.goldR), arma: int(o.arma, 0, 99), armor: int(o.armor, 0, 99), boss: !!o.boss,
    cat: ['demonio', 'humano', 'chefe'].includes(o.cat) ? o.cat : 'demonio', tpl: str(o.tpl || o.name, 40), gmNote: str(o.gmNote, 3000), bio: str(o.bio, 3000) });
  if (PARTS.includes(o.weakPart)) ch.weakPart = o.weakPart;
  if (Object.hasOwn(R.rank, o.rank)) ch.rank = o.rank;
  for (const a of ATTRS) ch.attrs[a] = int(o.attrs?.[a] ?? ch.attrs[a], 1, 100);
  for (const k of Object.keys(ch.bon)) ch.bon[k] = int(o.bon?.[k], -999, 999);
  for (const [k, n] of Object.entries(o.inv || {})) if (map.items[k]) ch.inv[map.items[k]] = int(n, 1, 99);
  for (const [sl, k] of Object.entries(o.equip || {})) if (ITYPES.includes(sl) && map.items[k]) ch.equip[sl] = map.items[k];
  if (o.tune && typeof o.tune === 'object') ch.tune = { hp: Math.min(5, Math.max(.2, +o.tune.hp || 1)), arma: int(o.tune.arma, -20, 20) };
  return ch;
}
// importa juntando pelo nome: o que já existe com o mesmo nome é atualizado, o resto entra como novo; nada do que existe é apagado
function importPack(p) {
  if (!p || typeof p !== 'object' || p.vj !== 'conteudo') throw new Error('Este arquivo não é um pacote de conteúdo do virtualJRPG.');
  const map = { skills: {}, items: {}, best: {} }, n = { skills: 0, items: 0, best: 0, enc: 0 };
  for (const coll of ['skills', 'items']) for (const [k, o] of Object.entries(p[coll] || {}).slice(0, 2000)) {
    const d = cleanDef(coll, o), cur = Object.keys(S[coll]).find(id => S[coll][id].name === d.name), id = cur || rid();
    if (coll === 'skills' && cur) { d.gx = S.skills[cur].gx; d.gy = S.skills[cur].gy; } // quem já está na grade fica onde está
    S[coll][id] = d; map[coll][k] = id; n[coll]++;
  }
  for (const [k, o] of Object.entries(p.bestiary || {}).slice(0, 500)) {
    if (!o || typeof o !== 'object') continue;
    const ch = cleanFoe(o, map), id = Object.keys(S.bestiary).find(b => S.bestiary[b].name === ch.name) || rid();
    S.bestiary[id] = { ...ch, id }; map.best[k] = id; n.best++;
  }
  for (const e of Object.values(p.encounters || {}).slice(0, 200)) {
    const list = (Array.isArray(e?.list) ? e.list : []).slice(0, 12).filter(x => x && map.best[x.b]).map(x => ({ b: map.best[x.b], tier: Object.hasOwn(TIER, x.tier) ? x.tier : 'normal', n: int(x.n || 1, 1, 12) }));
    if (list.length) { S.encounters[rid()] = { name: String(e.name || 'Encontro').slice(0, 40), list }; n.enc++; }
  }
  log('Mestre', `importou um pacote de conteúdo: ${n.skills} skills, ${n.items} itens, ${n.best} modelos e ${n.enc} encontros.`, '', { to: GM });
  return n;
}
const exportPack = () => ({ vj: 'conteudo', v: 1, title: S.title, skills: S.skills, items: S.items, bestiary: S.bestiary, encounters: S.encounters });

// ---------- ações do mestre ----------
['campName', 'campSave', 'campLoad', 'campNew', 'campDel', 'bkNow', 'bkRestore', 'sessMark'].forEach(k => NOUNDO.add(k));
Object.assign(H, {
  campName: gm((c, m) => { flushDiary(); S.title = String(m.v || '').trim().slice(0, 40) || 'Campanha'; }),
  campSave: gm(() => { saveSlot(); log('Mestre', `guardou a campanha "${S.title}".`, '', { to: GM }); }),
  campLoad: gm((c, m) => { // guarda a atual e abre outra
    if (!safe(m.id)) return;
    const o = readJson(path.join(CAMPS, m.id + '.json')); saveSlot(); swap(o);
    log('Mestre', `abriu a campanha "${S.title}".`, '', { to: GM });
  }),
  campNew: gm((c, m) => { saveSlot(); swap(BLANK(), true); S.title = String(m.v || '').trim().slice(0, 40) || 'Nova campanha'; log('Mestre', `começou a campanha "${S.title}".`); }),
  campDel: gm((c, m) => { if (safe(m.id)) { fs.rmSync(path.join(CAMPS, m.id + '.json'), { force: true }); touch(); } }),
  bkNow: gm(() => { backup('manual'); touch(); log('Mestre', 'fez uma cópia de segurança.', '', { to: GM }); }),
  bkRestore: gm((c, m) => { if (!safe(m.id)) return; const o = readJson(path.join(BK, m.id)); swap(o); log('Mestre', `restaurou a cópia ${m.id}.`, '', { to: GM }); }),
  sessMark: gm((c, m) => log('Sessão', String(m.v || '').trim().slice(0, 80) || 'Nova sessão', 'ok')), // marca no diário onde uma sessão começa
  edDup: gm((c, m) => { // duplica uma skill ou item do editor
    if (!Object.hasOwn(NEW, m.coll) || !Object.hasOwn(S[m.coll], m.id)) return;
    const o = structuredClone(S[m.coll][m.id]); o.name = (o.name + ' (cópia)').slice(0, 40); delete o.root;
    if (m.coll === 'skills') { const used = new Set(Object.values(S.skills).map(s => s.gx + ',' + s.gy)); while (used.has(o.gx + ',' + o.gy)) o.gx++; } // primeira casa livre à direita
    S[m.coll][rid()] = o;
  }),
  edSet: gm((c, m) => {
    if (!Object.hasOwn(SCH, m.coll) || !Object.hasOwn(SCH[m.coll], m.f) || !Object.hasOwn(S[m.coll], m.id)) return;
    const o = S[m.coll][m.id]; o[m.f] = coerce(SCH[m.coll][m.f], m.v, o[m.f]);
  }),
});

// cópia automática a cada 10 minutos, só se algo mudou desde a última
function autoBackup() { let last = S.seq; setInterval(() => { if (S.seq === last) return; last = S.seq; try { backup('auto'); touch(); } catch (e) { console.error('Falha na cópia automática:', e.message); } }, 600e3).unref(); }

// ---------- /api: exportar, importar e ler o diário (só com a chave do mestre) ----------
const diaryText = () => {
  flushDiary(); let raw = ''; try { raw = fs.readFileSync(diaryFile(), 'utf8'); } catch {}
  let day = ''; const out = [`Diário — ${S.title}`, ''];
  for (const l of raw.split('\n')) { let e; try { e = JSON.parse(l); } catch { continue; } const d = new Date(e.t), dd = d.toLocaleDateString('pt-BR');
    if (dd !== day) { day = dd; out.push('', `== ${dd} ==`); }
    out.push(e.who === 'Sessão' ? `\n--- ${e.text} ---` : `[${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${e.who}: ${e.text}`); }
  return out.join('\n') + (raw ? '\n' : '\nNada registrado ainda.\n');
};
function api(req, res) {
  const u = new URL(req.url, 'http://x'), p = u.pathname, what = u.searchParams.get('what');
  if (!p.startsWith('/api/') || p === '/api/hi') return false;
  const kIp = 'api:' + ipOf(req), end = (code, body = '') => (res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }).end(body), true);
  if (blocked(kIp)) return end(429);
  let k = ''; try { k = decodeURIComponent(req.headers['x-vj-key'] || ''); } catch {}
  if (!same(k, KEY)) { penalize(kIp); return end(401); }
  const json = o => (res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }).end(JSON.stringify(o)), true);
  if (req.method === 'GET' && p === '/api/export') return what === 'conteudo' ? json(exportPack()) : json({ ...S, users: undefined, reqs: {}, vj: 'campanha' }); // as senhas não saem no arquivo
  if (req.method === 'GET' && p === '/api/diario') return end(200, diaryText());
  if (req.method === 'POST' && p === '/api/import') {
    const chunks = []; let n = 0;
    req.on('data', d => { if ((n += d.length) > 40e6) { end(413); req.destroy(); } else chunks.push(d); });
    req.on('end', () => {
      if (res.writableEnded) return;
      try {
        const o = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (what === 'conteudo') importPack(o);
        else { if (o?.vj !== 'campanha') throw new Error('Este arquivo não é uma campanha exportada do virtualJRPG.'); saveSlot(); swap(cleanCampaign(o)); log('Mestre', `importou a campanha "${S.title}".`, '', { to: GM }); }
        push(); end(200, 'ok');
      } catch (e) { end(400, e.message || 'Arquivo inválido.'); }
    });
    return true;
  }
  return end(404);
}

hooks.api = api; hooks.store = storeInfo;

export { api, autoBackup, fix, importPack, storeInfo };

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { S } from './state.js';

// ---------- limites ----------
const UPMAX = 300e6; // teto de todas as imagens enviadas
const dirSize = d => { try { return fs.readdirSync(d).reduce((a, f) => a + fs.statSync(path.join(d, f)).size, 0); } catch { return 0; } };
const MAGIC = { '.png': b => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])), '.jpg': b => b[0] === 0xff && b[1] === 0xd8, '.gif': b => b.subarray(0, 4).toString('latin1') === 'GIF8', '.webp': b => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' };
Object.assign(MAGIC, { '.mp3': b => b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0), '.ogg': b => b.subarray(0, 4).toString('latin1') === 'OggS',
  '.wav': b => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE', '.m4a': b => b.subarray(4, 8).toString('latin1') === 'ftyp' });
const magic = (b, ext) => b.length > 12 && MAGIC[ext](b); // o conteúdo precisa ser mesmo uma imagem do tipo declarado
// logins e uploads errados: 8 erros em 5 min bloqueiam aquele IP (ou conta) por 5 min. Pelo túnel o IP real vem no cabeçalho do Cloudflare.
const fails = new Map(), FAIL_MAX = 8, FAIL_WIN = 300e3;
const ipOf = r => String(r.headers['cf-connecting-ip'] || r.socket.remoteAddress || '');
const blocked = k => { const f = fails.get(k); return !!f && f.n >= FAIL_MAX && Date.now() - f.t < FAIL_WIN; };
const penalize = k => { const f = fails.get(k), now = Date.now(); fails.set(k, f && now - f.t < FAIL_WIN ? { n: f.n + 1, t: now } : { n: 1, t: now }); if (fails.size > 5000) for (const [x, v] of fails) if (now - v.t > FAIL_WIN) fails.delete(x); };
const clean = k => fails.delete(k);
// excesso de mensagens de um cliente que não é o mestre, em janelas de 10 s
const flood = (c, kind, max) => { const now = Date.now(), w = (c.win ??= {})[kind]; if (!w || now - w.t > 10e3) { c.win[kind] = { t: now, n: 1 }; return false; } return ++w.n > max; };
const hash = (pw, salt = crypto.randomBytes(8).toString('hex')) => salt + ':' + crypto.scryptSync(String(pw), salt, 32).toString('hex');
const okName = n => !!n && !/[@\s]/.test(n) && n.toLowerCase() !== 'mestre';
const checkUser = (name, pass) => { const u = S.users[name]; return Object.hasOwn(S.users, name) && crypto.timingSafeEqual(Buffer.from(hash(pass, u.split(':')[0])), Buffer.from(u)); };

export { UPMAX, dirSize, MAGIC, magic, fails, FAIL_MAX, FAIL_WIN, ipOf, blocked, penalize, clean, flood, hash, okName, checkUser };

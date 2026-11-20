import fs from 'node:fs';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { PUB, SEA, UP, seaMod } from './config.js';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const FORMATS = { 0: [1, 1, 2, 4, 8, 16], 2: [3, 8, 16], 3: [1, 1, 2, 4, 8], 4: [2, 8, 16], 6: [4, 8, 16] };
const IMAGE_FIELDS = ['img', 'imgF', 'imgP', 'imgB'];

function paeth(a, b, c) {
  const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
  if (da <= db && da <= dc) return a;
  return db <= dc ? b : c;
}

function undoFilter(row, prior, stride, filter) {
  for (let i = 0; i < row.length; i++) {
    const a = i >= stride ? row[i - stride] : 0, b = prior[i], c = i >= stride ? prior[i - stride] : 0;
    switch (filter) {
      case 1: row[i] += a; break;
      case 2: row[i] += b; break;
      case 3: row[i] += (a + b) >> 1; break;
      case 4: row[i] += paeth(a, b, c); break;
    }
  }
}

function sample(row, index, depth) {
  if (depth === 8) return row[index];
  if (depth === 16) return row.readUInt16BE(index * 2);
  const bit = index * depth;
  return (row[bit >> 3] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
}

export function opaqueBox(buf) {
  try {
    if (!Buffer.isBuffer(buf) || !buf.subarray(0, 8).equals(SIGNATURE)) return null;
    const compressed = [];
    let header, palette, transparency, end = false;
    for (let pos = 8; pos + 12 <= buf.length;) {
      const len = buf.readUInt32BE(pos), next = pos + len + 12;
      const type = buf.toString('ascii', pos + 4, pos + 8);
      if (next > buf.length || (pos === 8 && type !== 'IHDR')) return null;
      const data = buf.subarray(pos + 8, next - 4);
      if (type === 'IHDR') {
        if (header || len !== 13) return null;
        header = data;
      } else if (type === 'PLTE') palette = data;
      else if (type === 'tRNS') transparency = data;
      else if (type === 'IDAT') compressed.push(data);
      else if (type === 'IEND') { end = len === 0 && next === buf.length; break; }
      pos = next;
    }
    if (!header || !end || !compressed.length) return null;
    const W = header.readUInt32BE(0), H = header.readUInt32BE(4), depth = header[8], color = header[9];
    const [channels, ...depths] = FORMATS[color] || [];
    if (!W || !H || W * H > 16e6 || !depths.includes(depth) || header[10] || header[11] || header[12]) return null;
    const colors = palette?.length / 3;
    if (color === 3 && (!Number.isInteger(colors) || colors < 1 || colors > 2 ** depth || transparency?.length > colors)) return null;
    const hasAlpha = color === 4 || color === 6;
    if (transparency && (hasAlpha || (color !== 3 && transparency.length !== channels * 2))) return null;
    const transparent = transparency && color !== 3 ? Array.from({ length: channels }, (_, i) => transparency.readUInt16BE(i * 2)) : null;
    const stride = Math.ceil(channels * depth / 8), bytes = Math.ceil(W * channels * depth / 8);
    const size = (bytes + 1) * H, raw = inflateSync(Buffer.concat(compressed), { maxOutputLength: size });
    if (raw.length !== size) return null;
    const full = !hasAlpha && !transparency && color !== 3;
    const threshold = depth === 16 ? 16 * 257 : 16;
    let prior = Buffer.alloc(full ? 0 : bytes), left = W, right = -1, top = H, bottom = -1;
    for (let y = 0, pos = 0; y < H; y++, pos += bytes + 1) {
      const filter = raw[pos];
      if (filter > 4) return null;
      if (full) continue;
      const row = raw.subarray(pos + 1, pos + 1 + bytes);
      if (filter) undoFilter(row, prior, stride, filter);
      prior = row;
      for (let x = 0; x < W; x++) {
        const base = x * channels;
        if (hasAlpha && sample(row, base + channels - 1, depth) < threshold) continue;
        if (transparent?.every((v, i) => sample(row, base + i, depth) === v)) continue;
        if (color === 3) {
          const i = sample(row, x, depth);
          if (i >= colors) return null;
          if ((transparency?.[i] ?? 255) < 16) continue;
        }
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = y;
      }
    }
    if (full) return { x: 0, y: 0, w: W, h: H, W, H };
    return right < 0 ? null : { x: left, y: top, w: right - left + 1, h: bottom - top + 1, W, H };
  } catch { return null; }
}

function localPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/')) return null;
  try {
    const name = decodeURIComponent(url.split(/[?#]/, 1)[0]);
    const parts = name.slice(1).split('/');
    if (parts.some(part => !part || part === '.' || part === '..' || /[\x00-\x1f\\:<>"|?*]/.test(part))) return null;
    return name;
  } catch { return null; }
}

export const localImage = url => /\.(png|jpe?g|webp|gif|svg)$/i.test(localPath(url) || '');
export function boxOfUrl(url) {
  const name = localPath(url);
  if (!name || path.extname(name).toLowerCase() !== '.png') return null;
  try {
    const upload = name.startsWith('/uploads/');
    if (SEA && !upload) return opaqueBox(Buffer.from(seaMod.getAsset('public' + name)));
    const root = fs.realpathSync(upload ? UP : PUB);
    const file = fs.realpathSync(path.join(root, upload ? name.slice('/uploads/'.length) : name.slice(1)));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) return null;
    return opaqueBox(fs.readFileSync(file));
  } catch { return null; }
}

export function setImage(ch, field, url) {
  ch[field] = url;
  const box = boxOfUrl(url);
  ch.box ??= {};
  if (box) ch.box[field] = box;
  else delete ch.box[field];
}

export function measureImages(ch) {
  if (ch.box && typeof ch.box === 'object' && !Array.isArray(ch.box)) {
    for (const field of IMAGE_FIELDS) {
      if (!ch[field]) delete ch.box[field];
    }
    return;
  }
  ch.box = {};
  for (const field of IMAGE_FIELDS) if (ch[field]) setImage(ch, field, ch[field]);
}

export { IMAGE_FIELDS };

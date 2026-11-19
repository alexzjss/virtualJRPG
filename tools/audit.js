// Auditoria da árvore de habilidades: acha o que foge da curva ou do que o nome promete.
//   node tools/audit.js            relatório completo
//   node tools/audit.js --quiet    só o resumo (e código de saída 1 se houver erro)
import { TREE } from '../tree.js';
import { CAM, DANO, forte } from '../arvore/camadas.js';
import { ATUAIS } from '../arvore/atuais.js';

const quiet = process.argv.includes('--quiet');
const nodes = [];
for (const [el, t] of Object.entries(TREE)) t.branches.forEach((br, bi) => br.forEach((n, ni) => nodes.push({ ...n, el, bi, ni, id: `${el}-${bi}.${ni}` })));
const found = { erro: [], aviso: [] };
const add = (lvl, kind, n, msg) => found[lvl].push({ kind, id: n.id, nome: n.n, msg });
const fx = n => n.fx || '';
const has = (n, re) => re.test(fx(n)) || re.test(n.fm || '') || re.test(n.st || '') || re.test(n.on ? 'on' : '');

// 1. nomes repetidos (a migração de fichas é feita pelo nome)
const seen = {};
for (const n of nodes) (seen[n.n] ??= []).push(n);
for (const [nome, l] of Object.entries(seen)) if (l.length > 1) for (const n of l) add('erro', 'nome repetido', n, `também em ${l.filter(o => o !== n).map(o => o.id).join(', ')}`);

// 2. campos obrigatórios
for (const n of nodes) {
  if (!n.n || !n.k) add('erro', 'campo', n, 'sem nome ou tipo');
  if (!n.d) add('aviso', 'campo', n, 'sem descrição');
  if (!(n.xp > 0)) add('erro', 'campo', n, 'XP inválido');
  if (['dmg', 'mental'].includes(n.k) && !(n.p > 0) || (n.k === 'heal' && !(n.p > 0) && !n.st && !fx(n))) add('aviso', 'campo', n, 'ataque ou cura sem poder');
}

// 3. camadas (arvore/camadas.js): ramo de até 10 nós, kit atual nas camadas 1–5, conceitos fortes da 7 em diante
for (const [el, t] of Object.entries(TREE)) t.branches.forEach((br, bi) => { if (!br.de && br.length > CAM) add('erro', 'camada', { id: `${el}-${bi}`, n: '(ramo)' }, `${br.length} nós (máximo ${CAM})`); });
for (const n of nodes) {
  if (!(n.cam >= 1 && n.cam <= CAM)) { add('erro', 'camada', n, 'sem camada'); continue; }
  if (ATUAIS.has(n.n) && n.cam > 5) add('erro', 'camada', n, `kit atual na camada ${n.cam} (máximo 5)`);
  if (forte(n) && n.cam < 7) add('aviso', 'camada', n, `conceito forte na camada ${n.cam} (pede 7+)`);
}

// 4. poder pela camada: dano equivalente (golpes × área) longe do dano-base da camada
for (const n of nodes.filter(n => n.k === 'dmg' && n.p && !n.limit)) {
  const eq = n.p * (n.hits || 1) * (n.area ? 1.4 : 1), D = DANO(n.cam), r = eq / D;
  if (r > 1.35) add('aviso', 'forte demais', n, `dano equivalente ${Math.round(eq)} na camada ${n.cam} (base ${Math.round(D)})`);
  if (r < .45) add('aviso', 'fraco demais', n, `dano equivalente ${Math.round(eq)} na camada ${n.cam} (base ${Math.round(D)})`);
}

// 5. o nome promete algo que o efeito não faz
const PROMESSAS = [
  [/Escudo|Muralha|Barreira|Égide|Bastião/i, /shield|st defUp|st guarded|guard|st counter|st taunt|fm|pas|reflect|brk|st defDn/i, 'escudo/defesa'],
  [/Ricochete|Cadeia|Em Cadeia/i, /chain|spread/i, 'ricochete'],
  [/Execu|Guilhotina|Misericórdia/i, /exec/i, 'execução'],
  [/Reviver|Ressurre|Renascer|Ressurgir/i, /revive|fall|on/i, 'reerguer'],
  [/Purific|Exorc/i, /cleanse|vs |strip|st /i, 'purificar'],
  [/Vampir|Hemofagia|Sanguessuga/i, /drain/i, 'roubo de vida'],
  [/Veneno|Peçonha|Tóxic/i, /poison/i, 'veneno'],
  [/Sangr|Hemorrag/i, /bleed|drain|det/i, 'sangramento'],
  [/Queima|Chamas|Incêndio|Ignição/i, /burn|det|per/i, 'fogo', 'kagutsuchi'],
  [/Congela|Gelo|Geada/i, /frozen|slow|st /i, 'gelo', 'susanoo'],
  [/Atordo|Paralis|Choque/i, /stun|para|st /i, 'controle'],
];
for (const n of nodes) {
  if (n.k === 'passive') continue;
  for (const [nome, efeito, rotulo, elemento] of PROMESSAS) {
    if (!nome.test(n.n) || /^Ritual/.test(n.n) || (elemento && n.el === elemento)) continue;
    const texto = `${fx(n)} ${n.rx || ''} ${n.fm || ''} ${n.st || ''} ${n.k} ${n.tg || ''} ${n.summon || ''} ${n.hits || ''}`;
    if (!efeito.test(texto) && n.k !== 'heal') add('aviso', 'nome promete', n, `o nome sugere ${rotulo}, mas o nó não tem esse efeito`);
  }
}

// 7. dependências: pre/ex apontando para nomes que não existem
const nomes = new Set(nodes.map(n => n.n));
for (const n of nodes) for (const p of (n.pre || '').split('|').filter(Boolean)) if (!nomes.has(p)) add('erro', 'pre inexistente', n, `"${p}" não existe`);

const total = found.erro.length + found.aviso.length;
if (!quiet) for (const lvl of ['erro', 'aviso']) for (const f of found[lvl]) console.log(`${lvl === 'erro' ? '✗' : '!'} [${f.kind}] ${f.id} · ${f.nome}: ${f.msg}`);
console.log(`${nodes.length} nós · ${found.erro.length} erros · ${found.aviso.length} avisos${total ? '' : ' · tudo certo'}`);
process.exit(found.erro.length ? 1 : 0);

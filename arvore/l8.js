// Construtor compacto da Leva 8. Um nó: N('Nome', 'descrição', 'spec', 'fx', { extras }).
// spec = tipo + poder/custo + marcas: d dano · m mental · h cura · u suporte · p passiva · f forma · L Limite (dano).
//   'd14/5' (poder 14, custo 5) · 'u/4' · 'L48' · marcas: a (área, ct 130) · x3 (3 golpes) · t60 (ct 60) · c1 (concentra 1 turno) · s (em si) · v (anunciado)
// 4º argumento: fx nas técnicas, `mod` nas passivas (o gatilho vai em extras: { on: 'hurt', fx: '...' }), `fm` nas formas.
// R('FOR', 'CON', ...nós): ramo de 10. XP e requisito vêm do lugar (1-4 baratos, 5-7 pedem o atributo A, 8-9 o B, 10 é o final);
// o atributo do nó é A (ou B nos nós 8-9), a não ser que o extra traga `a`. arvore/nivel.js ainda sobe os pisos das técnicas fortes.
const XP = [10, 10, 15, 15, 25, 30, 35, 30, 35, 70], RQ = [0, 0, 0, 0, 50, 52, 54, 52, 54, 58];
export function N(n, d, spec, f = '', x = {}) {
  const [h, ...fl] = spec.split(' '), m = /^([dmhupfL])(\d+)?(?:\/(\d+))?$/.exec(h);
  if (!m) throw new Error(`Leva 8: spec inválida "${spec}" em ${n}`);
  const k = { d: 'dmg', m: 'mental', h: 'heal', u: 'util', p: 'passive', f: 'form', L: 'dmg' }[m[1]], o = { n, k, d };
  if (m[1] !== 'p' && m[1] !== 'f') { o.p = +(m[2] || 0); o.c = +(m[3] || 0); }
  if (m[1] === 'f') o.c = +(m[3] || m[2] || 0);
  if (m[1] === 'L') { o.limit = true; o.c = 0; o.ct = 150; }
  for (const g of fl) {
    if (g === 'a') { o.area = true; o.ct = Math.max(o.ct || 0, 130); }
    else if (g === 's') o.tg = 'self';
    else if (g === 'v') o.tel = 1;
    else if (/^x\d$/.test(g)) o.hits = +g.slice(1);
    else if (/^t\d+$/.test(g)) o.ct = +g.slice(1);
    else if (/^c\d$/.test(g)) o.chg = +g.slice(1);
    else throw new Error(`Leva 8: marca "${g}" em ${n}`);
  }
  if (f) o[m[1] === 'p' ? 'mod' : m[1] === 'f' ? 'fm' : 'fx'] = f;
  if (o.hits > 1 && o.p) o.p = Math.max(o.p, 7); // a armadura conta em cada golpe: abaixo de 7 por golpe o multi-golpe não rende (tools/sim-skills.js)
  return { ...o, ...x };
}
export function R(A, B, ...ns) {
  return ns.map((o, i) => { const j = Math.min(i, 9), a = o.a || (j === 7 || j === 8 ? B : A), out = { ...o, xp: o.xp ?? (o.limit ? Math.max(80, XP[j]) : XP[j]) };
    if (o.k !== 'passive') out.a = a; else delete out.a;
    if (RQ[j] && !o.rq) out.rq = { [a]: RQ[j] };
    return out; });
}

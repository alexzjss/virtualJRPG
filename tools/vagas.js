// Mapa de vagas da árvore em camadas (arvore/camadas.js), para a próxima leva de skills.
//   node tools/vagas.js           resumo no terminal
//   node tools/vagas.js --md      também grava VAGAS-ARVORE.md
// Dois tipos de vaga: (1) casas que faltam para um ramo chegar a 10 nós (a técnica nova entra direto naquela camada);
// (2) células magras: setor × coluna temática × camada com menos nós que a média do setor (onde falta variedade).
import fs from 'fs';
import { TREE } from '../tree.js';
import { VAGAS, CAM, DANO, XP, RQ } from '../arvore/camadas.js';
import { temaNo } from '../arvore/ordem.js';

const TEMAS = ['ofensiva', 'controle', 'defesa', 'maestria', 'especial'];
const NOME = { marcial: 'Marcial', kagutsuchi: 'Kagutsuchi', susanoo: 'Susanoo', atlas: 'Atlas', indra: 'Indra', fuhaku: 'Fuhaku', amaterasu: 'Amaterasu', tsukuyomi: 'Tsukuyomi', shukketsu: 'Shukketsu', hiruko: 'Hiruko', aura: 'Aura', oculto: 'Ocultismo', armas: 'Armas' };
const md = [], out = l => { md.push(l); };
out('# Vagas da árvore (camadas)');
out('');
out(`Gerado por \`node tools/vagas.js --md\`. A posição no ramo é a camada (1 = começo, ${CAM} = ponta); a camada define o poder (arvore/camadas.js).`);
out('Toda técnica nova precisa respeitar o tema do Vínculo dono (arvore/temas.js): o build falha se não respeitar.');
out('');
out('## Curva por camada');
out('');
out('| Camada | Dano-base (alvo único, sem efeito) | XP | Requisito de atributo |');
out('|---|---|---|---|');
for (let L = 1; L <= CAM; L++) out(`| ${L} | ${Math.round(DANO(L))} | ${XP[L]} | ${RQ[L] || '—'} |`);
out('');
out('Área custa 40% do dano, cada efeito custa uma fatia do orçamento (controle ~22%, dano contínuo ~12%, debuff ~8%) e recarga lenta devolve orçamento. Limites: 1,8× o dano da camada, nas camadas 4, 7 e 10. Camadas 1–2: um efeito só. Conceitos fortes (clones, invocações, reviver, execução, possessão, domínios plenos, Despertares): camada 7+. Kit atual dos personagens: camadas 1–5.');
out('');

// (1) casas livres
const porSetor = {};
for (const v of VAGAS) (porSetor[v.el] ??= []).push(v);
out('## Casas livres (ramos com menos de 10 nós)');
out('');
let total = 0;
for (const [el, vs] of Object.entries(porSetor)) {
  const n = vs.reduce((a, v) => a + v.faltam.length, 0); total += n;
  out(`### ${NOME[el] || el} — ${n} casas`);
  out('');
  for (const v of vs) out(`- ramo ${v.ramo} (${v.tema}, ${v.tem} nós): camadas ${v.faltam.join(', ')}`);
  out('');
}

// (2) células magras
out('## Células magras (setor × coluna × camada)');
out('');
out('Cada célula conta os nós daquele tema naquela camada; "—" é zero. Em negrito, células abaixo da metade da média do setor.');
out('');
const magras = [];
for (const [el, t] of Object.entries(TREE)) {
  if (el === 'armas') continue;
  const m = TEMAS.map(() => new Array(CAM + 1).fill(0));
  for (const b of t.branches) for (const s of b) if (s.cam) m[temaNo(s)][s.cam]++;
  const media = m.flat().reduce((a, x) => a + x, 0) / (TEMAS.length * CAM);
  out(`### ${NOME[el]}`);
  out('');
  out('| coluna | ' + Array.from({ length: CAM }, (_, i) => i + 1).join(' | ') + ' |');
  out('|---|' + '---|'.repeat(CAM));
  TEMAS.forEach((tm, i) => {
    const cel = []; for (let L = 1; L <= CAM; L++) { const x = m[i][L]; if (x < media / 2) magras.push(`${NOME[el]}, ${tm}, camada ${L}`); cel.push(x ? (x < media / 2 ? `**${x}**` : String(x)) : '**—**'); }
    out(`| ${tm} | ${cel.join(' | ')} |`);
  });
  out('');
}
console.log(`casas livres: ${total} em ${VAGAS.length} ramos · células magras: ${magras.length}`);
for (const [el, vs] of Object.entries(porSetor)) console.log(`  ${(NOME[el] || el).padEnd(11)} ${vs.reduce((a, v) => a + v.faltam.length, 0)} casas`);
if (process.argv.includes('--md')) { fs.writeFileSync(new URL('../VAGAS-ARVORE.md', import.meta.url), md.join('\n') + '\n'); console.log('VAGAS-ARVORE.md gravado'); }

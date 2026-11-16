// Gera o executável único do servidor (Node SEA) para a plataforma em que roda: node tools/build-exe.mjs
// Saída: dist/virtualJRPG[.exe] e dist/LEIA-ME.txt. Os arquivos de public/ e o three.js vão embutidos.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process'; import { build } from 'esbuild'; import { inject } from 'postject';
const root = path.resolve(import.meta.dirname, '..'); process.chdir(root);
const win = process.platform === 'win32', mac = process.platform === 'darwin', exe = path.join('dist', win ? 'virtualJRPG.exe' : 'virtualJRPG');
fs.rmSync('build', { recursive: true, force: true }); fs.rmSync('dist', { recursive: true, force: true }); fs.mkdirSync('build'); fs.mkdirSync('dist');

await build({ entryPoints: ['server.js'], bundle: true, platform: 'node', format: 'cjs', target: 'node22', outfile: 'build/server.cjs', logLevel: 'warning',
  define: { __SEA__: 'true', 'import.meta.url': '"file:///sea"' } });

const assets = {}; // chave → arquivo; a chave é o caminho que o servidor pede em tempo de execução
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? walk(path.join(d, e.name)) : assets[path.posix.join(d.split(path.sep).join('/'), e.name)] = path.join(d, e.name));
walk('public');
for (const f of ['three.module.js', 'three.core.js']) assets['vendor/' + f] = path.join('node_modules', 'three', 'build', f);
fs.writeFileSync('build/sea-config.json', JSON.stringify({ main: 'build/server.cjs', output: 'build/sea.blob', disableExperimentalSEAWarning: true, assets }));
execFileSync(process.execPath, ['--experimental-sea-config', 'build/sea-config.json'], { stdio: 'inherit' });

fs.copyFileSync(process.execPath, exe); fs.chmodSync(exe, 0o755);
if (mac) execFileSync('codesign', ['--remove-signature', exe]);
await inject(exe, 'NODE_SEA_BLOB', fs.readFileSync('build/sea.blob'), { sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2', machoSegmentName: mac ? 'NODE_SEA' : undefined });
if (mac) execFileSync('codesign', ['--sign', '-', exe]);

fs.writeFileSync('dist/LEIA-ME.txt', `virtualJRPG - mesa virtual de RPG

COMO USAR
1. Dê dois cliques em ${path.basename(exe)}${win ? ' (se o Windows avisar "PC protegido", clique em Mais informações > Executar assim mesmo; o programa não é assinado)' : mac ? ' (no macOS: clique com o botão direito > Abrir, na primeira vez)' : ' (no terminal: ./virtualJRPG)'}.
2. A janela mostra os endereços e a CHAVE DO MESTRE. A chave também fica no arquivo data/gm-key.txt.
3. Mestre abre /gm, jogadores abrem /player, a TV abre /table.
4. Para jogar pela internet, abra um túnel para a porta 3000 (veja GUIA-RODAR.md no GitHub; o mais simples é: cloudflared tunnel --url http://localhost:3000).

DADOS
Tudo fica na pasta "data" ao lado do programa (campanha, mapas enviados, cópias de segurança). Para trocar de versão, substitua só o programa e mantenha a pasta data.
Porta diferente: defina a variável PORT. Chave própria: defina GM_KEY.
`);
console.log('\nOK:', exe, (fs.statSync(exe).size / 1e6).toFixed(0) + ' MB');

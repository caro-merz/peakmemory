import { build } from 'esbuild';
import { mkdir, cp, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

await mkdir('assets', { recursive: true });
for (const directory of ['assets', path.join('dist', 'assets')]) {
  let files;
  try { files = await readdir(directory); }
  catch (error) { if (error.code !== 'ENOENT') throw error; continue; }
  for (const filename of files) {
    if (/^(?:configurator\.(?:js|css)(?:\.LEGAL\.txt)?|(?:renderer|chunk)-[A-Z0-9]{8}\.js(?:\.LEGAL\.txt)?|licenses\.txt)$/.test(filename)) {
      await unlink(path.join(directory, filename));
    }
  }
}
await build({
  entryPoints: ['src/client/configurator.js'], bundle: true, format: 'esm', splitting: true,
  outdir: 'assets', entryNames: 'configurator', chunkNames: '[name]-[hash]',
  minify: true, target: ['es2022'], legalComments: 'linked', metafile: false,
  loader: { '.gpx': 'text' },
});
const packages = ['three', 'fast-xml-parser'];
let licenses = '';
const visited = new Set();
for (let index = 0; index < packages.length; index += 1) {
  const name = packages[index];
  if (visited.has(name)) continue;
  visited.add(name);
  const directory = path.join('node_modules', name);
  const manifest = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
  packages.push(...Object.keys(manifest.dependencies || {}));
  const candidates = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'];
  let license;
  for (const filename of candidates) {
    try { license = await readFile(path.join(directory, filename), 'utf8'); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  if (!license && name === '@nodable/entities') {
    license = await readFile('licenses/entities.txt', 'utf8');
  }
  if (!license) throw new Error(`Missing license for ${name}`);
  licenses += `${name} ${manifest.version}\n${license}\n\n`;
}
await writeFile('assets/licenses.txt', licenses + '\nQuicksand Book\n' + await readFile('fonts/OFL.txt', 'utf8'));
await mkdir('dist', { recursive: true });
for (const entry of ['index.html', 'configurator.html', 'images', 'fonts', 'assets', '_headers', '_redirects', 'robots.txt', 'sitemap.xml']) {
  await cp(entry, path.join('dist', entry), { recursive: true });
}
const configurator = await readFile('configurator.html', 'utf8');
const content = configurator.match(/    <noscript>[\s\S]*?(?=  <\/main>)/)?.[0];
const homepage = await readFile('index.html', 'utf8');
const placeholder = /<!-- CONFIGURATOR_CONTENT -->[\s\S]*?<!-- \/CONFIGURATOR_CONTENT -->/;
if (!content || !placeholder.test(homepage)) throw new Error('Missing shared configurator content or homepage placeholder');
await writeFile(path.join('dist', 'index.html'), homepage.replace(placeholder, () => content));
console.log('Built local configurator assets and public-only dist directory.');

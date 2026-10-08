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
try { await unlink(path.join('dist', 'configurator.html')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
for (const entry of ['index.html', 'gpx-hilfe.html', 'images', 'fonts', 'assets', '_headers', '_redirects', 'robots.txt', 'sitemap.xml']) {
  await cp(entry, path.join('dist', entry), { recursive: true });
}
const configurator = await readFile('configurator.html', 'utf8');
const content = configurator.match(/    <noscript>[\s\S]*?(?=  <\/main>)/)?.[0];
const homepage = await readFile('index.html', 'utf8');
const placeholder = /<!-- CONFIGURATOR_CONTENT -->[\s\S]*?<!-- \/CONFIGURATOR_CONTENT -->/;
if (!content || !placeholder.test(homepage)) throw new Error('Missing shared configurator content or homepage placeholder');
const imageManifest = JSON.parse(await readFile(path.join('images', 'optimized', 'manifest.json'), 'utf8'));
const srcset = image => image.variants.map(variant => `${variant.src} ${variant.width}w`).join(', ');
let builtHomepage = homepage.replace(placeholder, () => content);
builtHomepage = builtHomepage.replace(/<img\b[^>]*>/g, tag => {
  const source = tag.match(/\bsrc="([^"]+)"/)?.[1];
  const image = imageManifest[source];
  if (!image) return tag;
  const hero = source === 'images/main.jpeg';
  const sizes = hero ? '(max-width: 848px) calc(100vw - 48px), 800px'
    : '(max-width: 768px) calc(100vw - 48px), 540px';
  return tag.replace(/\s(?:loading|width|height)="[^"]*"/g, '')
    .replace(/\bsrc="[^"]*"/, `src="${image.variants.at(-1).src}"`)
    .replace(/>$/, ` srcset="${srcset(image)}" sizes="${sizes}" width="${image.width}" height="${image.height}" loading="${hero ? 'eager' : 'lazy'}" decoding="async"${hero ? ' fetchpriority="high"' : ''}>`);
});
const heroImage = imageManifest['images/main.jpeg'];
if (!heroImage) throw new Error('Missing optimized hero image');
builtHomepage = builtHomepage.replace(/<link rel="preload" as="image"[^>]*>/,
  `<link rel="preload" as="image" href="${heroImage.variants.at(-1).src}" imagesrcset="${srcset(heroImage)}" imagesizes="(max-width: 848px) calc(100vw - 48px), 800px" fetchpriority="high">`);
await writeFile(path.join('dist', 'index.html'), builtHomepage);
console.log('Built local configurator assets and public-only dist directory.');

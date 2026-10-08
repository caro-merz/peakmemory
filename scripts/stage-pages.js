import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

const directory = path.join('.wrangler', 'pages-project');
await mkdir(directory, { recursive: true });
for (const [source, target] of [['dist', 'public'], ['functions', 'functions'], ['src/server', 'src/server'], ['src/shared', 'src/shared']]) {
  await cp(source, path.join(directory, target), { recursive: true });
}
await cp('deploy/pages.toml', path.join(directory, 'wrangler.toml'));
console.log('Staged Pages public assets and Functions in .wrangler/pages-project.');

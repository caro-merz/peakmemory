import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectDirectory = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputDirectory = path.join(projectDirectory, 'images', 'optimized');
const homepageImages = [
  'classic.jpeg',
  'main.jpeg',
  'compact.jpeg',
  'custom.jpeg',
  'rahmen.jpeg',
  'rahmen2.jpeg',
  'XXL_Fuji.jpeg',
  'XXL_E5.jpeg',
  'insights1.jpeg',
  'insight2.jpeg',
  'insights3.jpeg',
  'insights4.jpeg',
  'insights5.jpeg',
  'insights6.jpeg',
  'insights7.jpeg',
  'ABM1.jpeg',
  'ABM2.jpeg',
  'ABM3.jpeg',
  'ABM4.jpeg',
  'APM_recap1.jpeg',
  'APM_recap2.jpeg',
  'APM_recap3.jpeg',
  'APM1.jpeg',
  'caro_new.jpeg',
  'alex_new.jpeg',
];

await mkdir(outputDirectory, { recursive: true });

const manifest = {};
let generatedCount = 0;
for (const filename of homepageImages) {
  const sourcePath = path.join(projectDirectory, 'images', filename);
  const metadata = await sharp(sourcePath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error(`Could not determine image dimensions: ${sourcePath}`);
  }

  const widths = filename === 'main.jpeg' ? [480, 960, 1440] : [480, 960];
  const stem = path.parse(filename).name;
  const variants = [];
  for (const width of widths) {
    if (width > metadata.width) continue;

    const outputPath = path.join(outputDirectory, `${stem}-${width}.webp`);
    const result = await sharp(sourcePath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(outputPath);

    console.log(`${path.relative(projectDirectory, outputPath)} ${result.width}x${result.height} ${result.size} bytes`);
    variants.push({
      src: `images/optimized/${stem}-${width}.webp`,
      width: result.width,
      height: result.height,
      bytes: result.size,
    });
    generatedCount += 1;
  }

  manifest[`images/${filename}`] = {
    width: metadata.width,
    height: metadata.height,
    variants,
  };
}

const manifestPath = path.join(outputDirectory, 'manifest.json');
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`${path.relative(projectDirectory, manifestPath)} (${Object.keys(manifest).length} images)`);
console.log(`Generated ${generatedCount} WebP images.`);

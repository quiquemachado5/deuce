import { mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'app', 'icon.svg'));
const icons = join(root, 'public', 'icons');

await mkdir(icons, { recursive: true });

async function render(size, target) {
  await sharp(source, { density: 384 })
    .resize(size, size)
    .png({ compressionLevel: 9, palette: true })
    .toFile(target);
}

await Promise.all([
  render(32, join(icons, 'deuce-32.png')),
  render(180, join(root, 'app', 'apple-icon.png')),
  render(192, join(icons, 'deuce-192.png')),
  render(512, join(icons, 'deuce-512.png')),
  sharp(source, { density: 384 })
    .resize(410, 410)
    .extend({ top: 51, right: 51, bottom: 51, left: 51, background: '#101318' })
    .png({ compressionLevel: 9, palette: true })
    .toFile(join(icons, 'deuce-maskable-512.png')),
]);

console.log('Generated DEUCE favicon, Apple touch and installable app icons.');

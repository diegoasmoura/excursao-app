import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public', 'app-icon.svg');
const svg = await readFile(source);

async function writePng(name, size, padding = 0) {
  const inner = Math.round(size * (1 - padding * 2));
  const icon = await sharp(svg).resize(inner, inner).png().toBuffer();
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: '#0F172A',
    },
  }).composite([{ input: icon, left: Math.round((size - inner) / 2), top: Math.round((size - inner) / 2) }]);
  await writeFile(path.join(root, 'public', name), await image.png().toBuffer());
}

await writePng('pwa-192x192.png', 192);
await writePng('pwa-512x512.png', 512);
await writePng('pwa-512x512-maskable.png', 512, 0.18);
await writePng('apple-touch-icon.png', 180);

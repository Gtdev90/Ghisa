// Genera le icone PNG della PWA renderizzando l'SVG con Chrome/Edge headless.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { svg, renderPng, cleanup } from './lib/render.mjs';

const OUT = fileURLToPath(new URL('../app/icons/', import.meta.url));
mkdirSync(OUT, { recursive: true });

writeFileSync(join(OUT, 'icon.svg'), svg({ scale: 0.92 }));

const ICONS = [
  ['icon-192.png', 192, 0.92],
  ['icon-512.png', 512, 0.92],
  ['maskable-512.png', 512, 0.7],
  ['apple-touch-icon.png', 180, 0.8],
];
for (const [name, size, scale] of ICONS) {
  renderPng(svg({ scale }), size, join(OUT, name));
  console.log('icona', name);
}
cleanup();

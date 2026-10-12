// Copia GSAP e i font da node_modules dentro app/ così la PWA funziona offline senza CDN.
import { cpSync, mkdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const app = new URL('app/', root);
const nm = new URL('node_modules/', root);

const GSAP = [
  'gsap', 'CustomEase', 'CustomBounce', 'Draggable', 'InertiaPlugin', 'DrawSVGPlugin',
  'Flip', 'Observer', 'Physics2DPlugin', 'ScrambleTextPlugin', 'SplitText',
];
mkdirSync(new URL('vendor/gsap/', app), { recursive: true });
for (const f of GSAP) {
  cpSync(new URL(`gsap/dist/${f}.min.js`, nm), new URL(`vendor/gsap/${f}.min.js`, app));
}

// Ponte Capacitor per l'APK (sul web resta inattivo).
cpSync(new URL('@capacitor/core/dist/capacitor.js', nm), new URL('vendor/capacitor.js', app));

const FONTS = {
  'big-shoulders-display.woff2': '@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2',
  'martian-mono.woff2': '@fontsource-variable/martian-mono/files/martian-mono-latin-standard-normal.woff2',
  'barlow-400.woff2': '@fontsource/barlow/files/barlow-latin-400-normal.woff2',
  'barlow-500.woff2': '@fontsource/barlow/files/barlow-latin-500-normal.woff2',
  'barlow-600.woff2': '@fontsource/barlow/files/barlow-latin-600-normal.woff2',
  'barlow-700.woff2': '@fontsource/barlow/files/barlow-latin-700-normal.woff2',
};
mkdirSync(new URL('fonts/', app), { recursive: true });
for (const [out, src] of Object.entries(FONTS)) {
  cpSync(new URL(src, nm), new URL(`fonts/${out}`, app));
}

console.log(`vendor: ${GSAP.length} file GSAP, ${Object.keys(FONTS).length} font copiati in app/`);

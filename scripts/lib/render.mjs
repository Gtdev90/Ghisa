// Rendering di SVG in PNG con Chrome/Edge headless (nessuna dipendenza nativa).
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BROWSERS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
];

// Manicotto del bilanciere caricato con i dischi A B C D (rosso, blu, giallo, verde), su 512×512.
export const MARK = `
  <rect x="40" y="241" width="432" height="30" rx="7" fill="#6e6b63"/>
  <rect x="112" y="210" width="22" height="92" rx="6" fill="#aaa69c"/>
  <rect x="144" y="92" width="56" height="328" rx="13" fill="#ee3b2f"/>
  <rect x="208" y="112" width="52" height="288" rx="12" fill="#3d74ff"/>
  <rect x="268" y="132" width="48" height="248" rx="11" fill="#f7c51b"/>
  <rect x="324" y="152" width="44" height="208" rx="10" fill="#22b85e"/>`;

export const FLOOR = '#0b0b0a';

/** SVG 512×512: `bg` può essere un colore, 'none', 'round' (cerchio) o 'squircle'. */
export function svg({ scale = 1, bg = FLOOR, mono = false } = {}) {
  let back = '';
  if (bg === 'round') back = `<circle cx="256" cy="256" r="256" fill="${FLOOR}"/>`;
  else if (bg === 'squircle') back = `<rect width="512" height="512" rx="104" fill="${FLOOR}"/>`;
  else if (bg !== 'none') back = `<rect width="512" height="512" fill="${bg}"/>`;
  const mark = mono ? MARK.replace(/fill="#[0-9a-f]{6}"/gi, 'fill="#ffffff"') : MARK;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${back}
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${mark}</g></svg>`;
}

const browser = BROWSERS.find(existsSync);
const tmp = join(tmpdir(), 'ghisa-render');

/** Salva `svgText` come PNG quadrato `size`×`size` (trasparente se `transparent`). */
export function renderPng(svgText, size, out, { transparent = false } = {}) {
  if (!browser) throw new Error('Serve Chrome o Edge per generare le immagini');
  mkdirSync(tmp, { recursive: true });
  const page = join(tmp, 'page.html');
  writeFileSync(page, `<!doctype html><html><head><style>html,body{margin:0;background:${transparent ? 'transparent' : FLOOR};overflow:hidden}svg{display:block;width:100vw;height:100vh}</style></head><body>${svgText}</body></html>`);
  // Profilo dedicato: un browser già aperto altrimenti "assorbe" il comando.
  // Chrome headless ha una larghezza minima: si renderizza a 512 e si scala col device scale factor.
  execFileSync(browser, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--force-device-scale-factor=${size / 512}`,
    `--user-data-dir=${join(tmp, 'profile')}`,
    ...(transparent ? ['--default-background-color=00000000'] : []),
    '--window-size=512,512', `--screenshot=${out}`, pathToFileURL(page).href,
  ], { stdio: 'ignore' });
}

export function cleanup() {
  try {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  } catch {
    // Il browser può tenere il lockfile del profilo ancora per qualche istante.
  }
}

// Installa l'app GHISA sull'orologio Wear OS via Wi-Fi (adb).
//
// Sull'orologio: Impostazioni > Sistema > Informazioni > Versioni > tocca 7 volte "Numero build",
// poi Impostazioni > Opzioni sviluppatore > attiva "Debug ADB" e "Debug tramite Wi-Fi".
// Compare un indirizzo IP:porta (e, al primo uso, "Associa nuovo dispositivo" con codice e porta).
//
// Uso:
//   npm run orologio -- 192.168.1.50:5555                      (già associato)
//   npm run orologio -- 192.168.1.50:5555 --pair 192.168.1.50:41234 123456
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { homedir } from 'node:os';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const exe = process.platform === 'win32' ? 'adb.exe' : 'adb';
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  || (process.platform === 'win32' ? join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk') : join(homedir(), 'Android', 'Sdk'));
const ADB = existsSync(join(sdk, 'platform-tools', exe)) ? join(sdk, 'platform-tools', exe) : 'adb';

const args = process.argv.slice(2);
const pairAt = args.indexOf('--pair');
let pairAddr = null;
let pairCode = null;
if (pairAt >= 0) {
  pairAddr = args[pairAt + 1]?.replace(/[<>]/g, '');
  pairCode = args[pairAt + 2]?.replace(/[<>]/g, '');
}

const remaining = args
  .filter((a, i) => i !== pairAt && i !== pairAt + 1 && i !== pairAt + 2 && !a.startsWith('--'))
  .map((a) => a.replace(/[<>]/g, '').replace(/^IP:/i, ''));

let target = remaining[0];

const adb = (...a) => execFileSync(ADB, a, { stdio: 'inherit' });

if (pairAddr && pairCode) {
  console.log(`Associazione in corso con ${pairAddr}...`);
  adb('pair', pairAddr, pairCode);
}

if (!target) {
  try {
    const out = execFileSync(ADB, ['devices'], { encoding: 'utf8' });
    const lines = out.split('\n').filter((l) => l.includes('\tdevice'));
    if (lines.length === 1) {
      target = lines[0].split('\t')[0].trim();
      console.log(`Dispositivo connesso rilevato: ${target}`);
    }
  } catch {}
}

if (!target) {
  console.error('\nErrore: specifica l\'indirizzo IP e la porta principale dell\'orologio.');
  console.error('Esempio: npm run orologio -- 192.168.1.14:PORTA [--pair 192.168.1.14:PORTA_PAIR CODICE]');
  process.exit(1);
}

adb('connect', target);

const dist = join(ROOT, 'dist');
const apk = readdirSync(dist).filter((f) => /^(GT-Workout|GHISA)-Watch-.*\.apk$/.test(f)).sort().pop();
if (!apk) throw new Error('Manca dist/GT-Workout-Watch-*.apk: esegui prima "npm run apk"');
adb('-s', target, 'install', '-r', join(dist, apk));
adb('-s', target, 'shell', 'pm', 'grant', 'it.ghisa.app', 'android.permission.BODY_SENSORS');
adb('-s', target, 'shell', 'pm', 'grant', 'it.ghisa.app', 'android.permission.ACTIVITY_RECOGNITION');
adb('-s', target, 'shell', 'pm', 'grant', 'it.ghisa.app', 'android.permission.POST_NOTIFICATIONS');
console.log(`\nInstallato ${apk} sull'orologio. Apri GHISA dal menu app.`);

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
const target = args[0];
if (!target) {
  console.error('Uso: npm run orologio -- <IP:porta> [--pair <IP:porta-di-associazione> <codice>]');
  process.exit(1);
}
const adb = (...a) => execFileSync(ADB, a, { stdio: 'inherit' });

const pairAt = args.indexOf('--pair');
if (pairAt >= 0) adb('pair', args[pairAt + 1], args[pairAt + 2]);
adb('connect', target);

const dist = join(ROOT, 'dist');
const apk = readdirSync(dist).filter((f) => /^GHISA-Watch-.*\.apk$/.test(f)).sort().pop();
if (!apk) throw new Error('Manca dist/GHISA-Watch-*.apk: esegui prima "npm run apk"');
adb('-s', target, 'install', '-r', join(dist, apk));
adb('-s', target, 'shell', 'pm', 'grant', 'it.ghisa.app', 'android.permission.BODY_SENSORS');
adb('-s', target, 'shell', 'pm', 'grant', 'it.ghisa.app', 'android.permission.ACTIVITY_RECOGNITION');
adb('-s', target, 'shell', 'pm', 'grant', 'it.ghisa.app', 'android.permission.POST_NOTIFICATIONS');
console.log(`\nInstallato ${apk} sull'orologio. Apri GHISA dal menu app.`);

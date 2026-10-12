// Compila l'APK Android: aggiorna la cache della PWA, sincronizza app/ nel progetto Android,
// esegue Gradle (con il JDK di Android Studio se JAVA_HOME non è impostato) e copia l'APK in dist/.
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const ANDROID = join(ROOT, 'android');
const win = process.platform === 'win32';

const env = { ...process.env };
if (!env.JAVA_HOME) {
  const jbr = [
    'C:/Program Files/Android/Android Studio/jbr',
    '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
    '/opt/android-studio/jbr',
  ].find(existsSync);
  if (jbr) env.JAVA_HOME = jbr;
}

const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, env, stdio: 'inherit' });

// Se in pubblicazione.json c'è l'indirizzo GitHub Pages, l'APK carica l'app da lì (aggiornamenti automatici);
// il service worker la tiene comunque in cache, quindi funziona anche offline dopo il primo avvio.
const capPath = join(ROOT, 'capacitor.config.json');
const cap = JSON.parse(readFileSync(capPath, 'utf8'));
const { url = '' } = JSON.parse(readFileSync(join(ROOT, 'pubblicazione.json'), 'utf8'));
if (url) {
  cap.server = { url: url.endsWith('/') ? url : `${url}/`, cleartext: false };
  console.log('APK collegato a', cap.server.url);
} else {
  delete cap.server;
  console.log('APK con app incorporata (nessun indirizzo in pubblicazione.json)');
}
writeFileSync(capPath, `${JSON.stringify(cap, null, 2)}\n`);

run('node scripts/precache.mjs');
run('npx cap sync android');
// Percorso assoluto tra virgolette: la cartella del progetto può contenere spazi.
run(`"${join(ANDROID, win ? 'gradlew.bat' : 'gradlew')}" assembleRelease --console=plain`, ANDROID);

const gradle = readFileSync(join(ANDROID, 'app', 'build.gradle'), 'utf8');
const version = gradle.match(/versionName\s+"([^"]+)"/)?.[1] ?? 'dev';
const src = join(ANDROID, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
mkdirSync(join(ROOT, 'dist'), { recursive: true });
const out = join(ROOT, 'dist', `GHISA-${version}.apk`);
copyFileSync(src, out);
console.log(`\nAPK pronto: ${out}`);

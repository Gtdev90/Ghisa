// Pubblica una nuova versione: aggiorna la versione del service worker, fa commit e push.
// GitHub Actions ripubblica la cartella app/ su GitHub Pages; il telefono la scarica alla prossima apertura.
// Uso: npm run pubblica -- "descrizione della modifica"
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const msg = process.argv.slice(2).join(' ').trim() || `Aggiornamento ${new Date().toLocaleString('it-IT')}`;
const git = (...args) => execFileSync('git', args, { cwd: ROOT, stdio: 'inherit' });

execSync('node scripts/vendor.mjs && node scripts/precache.mjs', { cwd: ROOT, stdio: 'inherit' });
git('add', '-A');
try {
  execFileSync('git', ['diff', '--cached', '--quiet'], { cwd: ROOT });
  console.log('Nessuna modifica da pubblicare.');
  process.exit(0);
} catch {
  // Ci sono modifiche in staging: si procede.
}
git('commit', '-m', msg);
git('push');
console.log('\nPubblicato. In 1-2 minuti la nuova versione è online e il telefono la scarica da solo.');

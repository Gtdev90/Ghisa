// Aggiorna VERSION e ASSETS in app/sw.js: hash del contenuto di tutti i file dell'app,
// così ogni modifica produce una nuova cache e l'app propone l'aggiornamento.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../app/', import.meta.url));
const SW = join(APP, 'sw.js');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(APP)
  .filter((p) => p !== SW && !p.endsWith('.map'))
  .map((p) => relative(APP, p).split(sep).join('/'))
  .sort();

const hash = createHash('sha256');
for (const f of files) hash.update(f).update(readFileSync(join(APP, f)));
const version = hash.digest('hex').slice(0, 10);

let sw = readFileSync(SW, 'utf8');
sw = sw.replace(/const VERSION = '[^']*';/, `const VERSION = '${version}';`);
sw = sw.replace(/const ASSETS = \[[\s\S]*?\];/, `const ASSETS = [\n${files.map((f) => `  './${f}',`).join('\n')}\n];`);
writeFileSync(SW, sw);
console.log(`sw.js: versione ${version}, ${files.length} file in precache`);

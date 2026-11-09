// Test suite per le Note Personali degli Esercizi
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
globalThis.document = { addEventListener: () => {}, removeEventListener: () => {} };
globalThis.window = globalThis;

import {
  noteOf, saveNote, deleteNote, allNotes, noteDetailsOf,
  getActiveProfile, switchProfile, S,
} from '../app/js/store.js';

console.log('=== TEST NOTE ESERCIZI: Inizio ===');

// 1. Salva una nota su Panca Piana
console.log('Test 1: Salvataggio e lettura nota diretta');
saveNote('A-panca-piana-bilanciere', 'Foro 3, fermo al petto 1s, presa media');
const n1 = noteOf('A-panca-piana-bilanciere');
console.assert(n1 === 'Foro 3, fermo al petto 1s, presa media', `Atteso testo nota, ottenuto: ${n1}`);
const det1 = noteDetailsOf('A-panca-piana-bilanciere');
console.assert(det1 && typeof det1.updatedAt === 'number', 'Dettagli nota devono includere timestamp updatedAt');
console.log('✓ Test 1 superato');

// 2. Cross-scheda fallback (es. Leg curl presente in scheda B e scheda D)
console.log('Test 2: Cross-scheda fallback per esercizi condivisi');
saveNote('B-leg-curl', 'Sellino su 4, schienale indietro, caviglie bloccate');
const nB = noteOf('B-leg-curl');
const nD = noteOf('D-leg-curl');
console.assert(nB === 'Sellino su 4, schienale indietro, caviglie bloccate', 'Nota Scheda B fallita');
console.assert(nD === 'Sellino su 4, schienale indietro, caviglie bloccate', `Nota Scheda D deve ereditare la nota di B, ottenuto: ${nD}`);
console.log('✓ Test 2 superato');

// 3. allNotes() raccolta completa per il Diario
console.log('Test 3: Raccolta allNotes per Diario');
const list = allNotes();
console.assert(Array.isArray(list) && list.length === 2, `Attese 2 note nella raccolta (deduplicate per baseSlug), ottenute: ${list.length}`);
console.assert(list.some(x => x.name.includes('Panca') || x.id.includes('panca')), 'Panca piana deve essere nella lista');
console.assert(list.some(x => x.name.includes('Leg curl') || x.id.includes('leg-curl')), 'Leg curl deve essere nella lista');
console.log('✓ Test 3 superato');

// 4. Modifica nota esistente
console.log('Test 4: Modifica nota');
saveNote('A-panca-piana-bilanciere', 'Foro 4 aggiornato, presa un po\' più larga');
console.assert(noteOf('A-panca-piana-bilanciere') === 'Foro 4 aggiornato, presa un po\' più larga', 'Modifica nota fallita');
console.log('✓ Test 4 superato');

// 5. Cancellazione nota
console.log('Test 5: Eliminazione nota');
deleteNote('B-leg-curl');
console.assert(noteOf('B-leg-curl') === '', 'Nota B-leg-curl deve essere vuota');
console.assert(noteOf('D-leg-curl') === '', 'Nota D-leg-curl deve essere vuota');
console.assert(allNotes().length === 1, 'Dopo cancellazione deve rimanere 1 nota');
console.log('✓ Test 5 superato');

// 6. Isolamento profili (Giulio vs Stefania)
console.log('Test 6: Isolamento profili');
console.assert(getActiveProfile() === 'giulio', 'Profilo iniziale deve essere Giulio');
console.assert(noteOf('A-panca-piana-bilanciere') !== '', 'Giulio deve avere la nota su panca');

switchProfile('stefania');
console.assert(getActiveProfile() === 'stefania', 'Profilo attivo deve essere Stefania');
console.assert(noteOf('A-panca-piana-bilanciere') === '', 'Stefania NON deve avere le note di Giulio');
saveNote('A-squat', 'Note di Stefania: elastico sopra le ginocchia');
console.assert(noteOf('A-squat') === 'Note di Stefania: elastico sopra le ginocchia', 'Nota Stefania salvata');

switchProfile('giulio');
console.assert(getActiveProfile() === 'giulio', 'Tornato a Giulio');
console.assert(noteOf('A-panca-piana-bilanciere') !== '', 'Le note di Giulio sono intatte');
console.assert(noteOf('A-squat') === '', 'Giulio NON deve avere la nota di Stefania');
console.log('✓ Test 6 superato');

console.log('=== TUTTI I TEST DELLE NOTE SUPERATI CON SUCCESSO! ===');

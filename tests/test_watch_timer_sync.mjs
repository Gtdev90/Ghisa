// Test di sincronizzazione del timer / recupero tra orologio Wear OS e telefono
const storage = {};
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
};
globalThis.document = { addEventListener: () => {}, removeEventListener: () => {} };
globalThis.window = globalThis;

import { S, remoteApply, startWorkout } from '../app/js/store.js';

console.log('=== TEST WATCH TIMER SYNC: Inizio ===');

// 1. Comando 'set' con recupero
startWorkout('A');
const now = Date.now();
const futureEndAt = now + 90 * 1000;

const setCmd = {
  id: 'cmd-test-1',
  type: 'set',
  t: now,
  scheda: 'A',
  ex: 'A-panca-piana-bilanciere',
  i: 0,
  reps: 10,
  kg: 60,
  rest: 90,
  label: 'Prossima: Panca piana · serie 2 di 3',
  startedAt: now - 60000,
  endAt: futureEndAt,
};

remoteApply(setCmd);
console.log('Stato timer dopo setCmd:', S().timer);
console.assert(S().timer !== null, 'Timer dovrebbe essere attivo dopo set con rest > 0');
console.assert(S().timer.dur === 90, `durata attesa 90, trovato ${S().timer?.dur}`);
console.assert(S().timer.endAt === futureEndAt, `endAt atteso ${futureEndAt}, trovato ${S().timer?.endAt}`);
console.assert(S().timer.scheda === 'A', 'scheda attesa A');
console.assert(S().timer.label.includes('Panca piana'), 'label atteso corretto');
console.log('✓ TEST 1: Comando set avvia il timer nello store');

// 2. Comando 'adjustRest' (+15)
const adjustCmd = {
  id: 'cmd-test-2',
  type: 'adjustRest',
  t: now,
  delta: 15,
};
remoteApply(adjustCmd);
console.assert(S().timer.endAt === futureEndAt + 15000, `endAt atteso ${futureEndAt + 15000}, trovato ${S().timer?.endAt}`);
console.log('✓ TEST 2: Comando adjustRest aggiorna il timer');

// 3. Comando 'clearRest' (Salta sull\'orologio)
const clearCmd = {
  id: 'cmd-test-3',
  type: 'clearRest',
  t: now,
};
remoteApply(clearCmd);
console.assert(S().timer === null, 'Timer dovrebbe essere null dopo clearRest');
console.log('✓ TEST 3: Comando clearRest ferma il timer');

// 4. Comando 'attempt' con recupero test RM
const attemptCmd = {
  id: 'cmd-test-4',
  type: 'attempt',
  t: now,
  scheda: 'A',
  ex: 'A-panca-piana-bilanciere',
  kg: 70,
  ok: true,
  rest: 180,
  label: 'Panca piana · prossimo tentativo a 72,5 kg',
  startedAt: now - 30000,
  endAt: now + 180 * 1000,
};
remoteApply(attemptCmd);
console.assert(S().timer !== null, 'Timer dovrebbe essere attivo dopo attempt con rest > 0');
console.assert(S().timer.dur === 180, 'durata attesa 180');
console.assert(S().timer.label.includes('prossimo tentativo'), 'label atteso');
console.log('✓ TEST 4: Comando attempt avvia il timer test RM');

// 5. Comando 'set' con rest: 0 (tutte le serie completate)
const lastSetCmd = {
  id: 'cmd-test-5',
  type: 'set',
  t: now,
  scheda: 'A',
  ex: 'A-panca-piana-bilanciere',
  i: 1,
  reps: 10,
  kg: 60,
  rest: 0,
  label: 'Ultima serie fatta',
  startedAt: now - 60000,
};
remoteApply(lastSetCmd);
console.assert(S().timer === null, 'Timer dovrebbe essere null quando rest è 0');
console.log('✓ TEST 5: Comando set con rest=0 azzera il timer');

// 6. Comando scaduto nel passato (non deve attivare il timer)
const expiredCmd = {
  id: 'cmd-test-6',
  type: 'set',
  t: now - 200000,
  scheda: 'A',
  ex: 'A-panca-piana-bilanciere',
  i: 2,
  reps: 10,
  kg: 60,
  rest: 90,
  endAt: now - 110000, // scaduto 110s fa
};
remoteApply(expiredCmd);
console.assert(S().timer === null, 'Timer scaduto nel passato non deve attivarsi');
console.log('✓ TEST 6: Timer scaduto ignorato correttamente');

console.log('=== TUTTI I TEST DEL TIMER COMPLETATI CON SUCCESSO! ===');

// Mock environment for node test
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
  parseReps, oneRmPercent, analyzeProgression, currentTargetLoad,
  getActiveProfile, switchProfile, S, doSet, startWorkout, finishSession,
  setOverride, setDeloadType, toggleDeload
} from '../app/js/store.js';
import { EX } from '../app/js/data.js';

console.log('=== TEST 1: parseReps ===');
console.assert(parseReps(8).min === 8 && parseReps(8).max === 10, 'parseReps(8) failed');
console.assert(parseReps('8–10').min === 8 && parseReps('8–10').max === 10, 'parseReps(8–10) failed');
console.assert(parseReps('10–12').min === 10 && parseReps('10–12').max === 12, 'parseReps(10–12) failed');
console.assert(parseReps(5).min === 5 && parseReps(5).max === 5, 'parseReps(5) failed');
console.assert(parseReps(12).min === 12 && parseReps(12).max === 15, 'parseReps(12) failed');
console.log('parseReps OK');

console.log('=== TEST 2: oneRmPercent ===');
console.assert(oneRmPercent(1) === 0.70, 'Week 1 pct failed');
console.assert(oneRmPercent(2) === 0.725, 'Week 2 pct failed');
console.assert(oneRmPercent(3) === 0.75, 'Week 3 pct failed');
console.assert(oneRmPercent(4) === 0.775, 'Week 4 pct failed');
console.assert(oneRmPercent(1, true) === 0.65, 'Deload pct failed');
console.log('oneRmPercent OK');

console.log('=== TEST 3: Giulio Profile & Progression ===');
console.log('Current profile:', getActiveProfile());
console.assert(getActiveProfile() === 'giulio', 'Giulio should be active profile');
console.log('Giulio Meso Week:', S().meso.week);
console.assert(S().meso.week === 2, 'Giulio should be in week 2 based on 7 workouts in history');

const squat = EX['B-squat'] || EX['A-panca-piana-bilanciere'] || Object.values(EX).find(e => e.oneRM);
console.log('Testing 1RM exercise:', squat.name);
const prog1 = analyzeProgression(squat);
console.log('1RM Prog Week 2:', prog1);
console.assert(prog1.type === '1rm', 'Should be 1rm type');
console.assert(prog1.badge.includes('72.5%'), 'Should show 72.5% in week 2');

// Test Double Progression Simulation
console.log('=== TEST 3B: Double Progression Mechanics ===');
const dummyEx = { id: 'test-curl', name: 'Curl manubri', reps: '8–10', sets: 3, kind: 'dumbbell', oneRM: false };

// 1. Injected history: 10, 9, 8 reps (in range, not ceiling)
S().history.unshift({
  id: 'w1',
  type: 'workout',
  scheda: 'A',
  workout: 1,
  startedAt: Date.now() - 3600000,
  endedAt: Date.now(),
  items: [{
    id: 'test-curl',
    sets: [
      { reps: 10, kg: 14, rpe: 9 },
      { reps: 9, kg: 14, rpe: 9 },
      { reps: 8, kg: 14, rpe: 9.5 }
    ]
  }]
});
let dpProg = analyzeProgression(dummyEx);
console.log('Case 1 (10, 9, 8):', dpProg);
console.assert(dpProg.type === 'consolidate', 'Should consolidate');
console.assert(dpProg.suggestedKg === 14, 'Should keep 14kg');

// 2. Injected history: 10, 10, 10 reps (hit ceiling!)
S().history.unshift({
  id: 'w2',
  type: 'workout',
  scheda: 'A',
  workout: 1,
  startedAt: Date.now() - 1800000,
  endedAt: Date.now(),
  items: [{
    id: 'test-curl',
    sets: [
      { reps: 10, kg: 14, rpe: 9 },
      { reps: 10, kg: 14, rpe: 9 },
      { reps: 10, kg: 14, rpe: 10 }
    ]
  }]
});
dpProg = analyzeProgression(dummyEx);
console.log('Case 2 (10, 10, 10 ceiling hit):', dpProg);
console.assert(dpProg.type === 'unlocked', 'Should unlock next weight');
console.assert(dpProg.suggestedKg === 15, 'Should unlock 15kg (+1kg dumbbell)');
console.assert(dpProg.badge.includes('+1 kg sbloccati'), 'Badge should announce +1kg');

// 3. Injected history: 10, 8, 6 reps (fell below min 8)
S().history.unshift({
  id: 'w3',
  type: 'workout',
  scheda: 'A',
  workout: 1,
  startedAt: Date.now() - 900000,
  endedAt: Date.now(),
  items: [{
    id: 'test-curl',
    sets: [
      { reps: 10, kg: 15, rpe: 9 },
      { reps: 8, kg: 15, rpe: 9.5 },
      { reps: 6, kg: 15, rpe: 10 }
    ]
  }]
});
dpProg = analyzeProgression(dummyEx);
console.log('Case 3 (10, 8, 6 fell below):', dpProg);
console.assert(dpProg.type === 'caution', 'Should caution and consolidate');
console.assert(dpProg.suggestedKg === 15, 'Should keep 15kg');
console.log('Double Progression Mechanics OK!');

console.log('=== TEST 4: Stefania Profile Isolation ===');
switchProfile('stefania');
console.log('Switched to:', getActiveProfile());
console.assert(getActiveProfile() === 'stefania', 'Stefania should be active');
console.assert(S().phase === 'test', 'Stefania must be in test phase');
console.assert(Object.keys(S().rm).length === 0, 'Stefania must have 0 initial RMs');

switchProfile('giulio');
console.log('Switched back to:', getActiveProfile());
console.assert(getActiveProfile() === 'giulio', 'Giulio should be active again');
console.assert(S().phase === 'fase1', 'Giulio must be in fase1');

console.log('ALL TESTS PASSED SUCCESSFULLY!');

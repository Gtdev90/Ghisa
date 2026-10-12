// Programma di allenamento: schede di test (RM) + workout della Fase 1.
// Ogni esercizio: [nome, ripetizioni del test RM, serie Fase 1, ripetizioni Fase 1]
const RAW = [
  {
    id: 'A', workout: 1, groups: [
      ['Gambe/glutei', [
        ['Squat', 1, 4, 5],
        ['Stacco rumeno bilanciere', 10, 3, 8],
        ['Hip thrust', 12, 3, 10],
        ['Leg extension', 12, 3, 10],
      ]],
      ['Tricipiti', [
        ['French press manubri su panca piana', 10, 3, 8],
        ['Push down corda al cavo alto', 12, 3, 10],
      ]],
      ['Bicipiti', [
        ['Curl manubri in piedi', 10, 3, 8],
        ['Curl manubri su panca 60°', 12, 3, 10],
      ]],
    ],
  },
  {
    id: 'B', workout: 2, groups: [
      ['Schiena', [
        ['Rematore t bar triangolo', 10, 3, 8],
        ['Pulley machine triangolo', 10, 3, 8],
        ['Lat machine presa larga', 12, 3, 10],
      ]],
      ['Petto', [
        ['Spinte manubri su panca piana', 10, 3, 8],
      ]],
      ['Spalle', [
        ['Spinte in alto manubri seduto', 12, 3, 10],
        ['Alzate laterali manubri in piedi', 12, 3, 10],
        ['Alzate posteriori manubri a 90°', 12, 3, 10],
      ]],
      ['Addome', [
        ['Sit up a terra', 14, 3, 12],
      ]],
    ],
  },
  {
    id: 'C', workout: 3, groups: [
      ['Schiena', [
        ['Stacco', 1, 4, 5],
      ]],
      ['Gambe/glutei', [
        ['Hip thrust', 10, 3, 8],
        ['Leg press', 10, 3, 8],
        ['Leg curl', 12, 3, 10],
      ]],
      ['Bicipiti', [
        ['Curl manubri seduto', 12, 3, 10],
        ['Curl manubri su panca 45°', 14, 3, 12],
      ]],
      ['Tricipiti', [
        ['French press corda al cavo basso', 12, 3, 10],
        ['Push down barra al cavo alto', 14, 3, 12],
      ]],
    ],
  },
  {
    id: 'D', workout: 4, groups: [
      ['Spalle', [
        ['Spinte in alto manubri seduto', 10, 3, 8],
        ['Alzate laterali manubri seduto', 12, 3, 10],
        ['Alzate laterali su panca 45°', 12, 3, 10],
      ]],
      ['Schiena', [
        ['Lat machine presa media', 10, 3, 8],
        ['Rematore manubrio', 10, 3, 8],
        ['Lat machine triangolo', 12, 2, 10],
      ]],
      ['Gambe/glutei', [
        ['Hyperextension', 12, 3, 10],
        ['Abductor machine', 14, 3, 12],
      ]],
      ['Addome', [
        ['Crunch in ginocchio al cavo alto', 14, 3, 12],
      ]],
    ],
  },
];

// Protocollo "Test massimale" per Squat e Stacco. Il riposo è quello DOPO lo step:
// 1+2+2+2+3+4+5 = 19 minuti, la durata stimata del protocollo.
export const PROTOCOL = {
  minutes: 19,
  steps: [
    { step: 1, sets: 2, reps: '10–15', pct: null, rest: null, note: 'Bilanciere vuoto' },
    { step: 2, sets: 1, reps: 8, pct: 30, rest: 1 },
    { step: 3, sets: 1, reps: 5, pct: 40, rest: 2 },
    { step: 4, sets: 1, reps: 3, pct: 50, rest: 2 },
    { step: 5, sets: 1, reps: 3, pct: 60, rest: 2 },
    { step: 6, sets: 1, reps: 2, pct: 70, rest: 3 },
    { step: 7, sets: 1, reps: 1, pct: 80, rest: 4 },
    { step: 8, sets: 1, reps: 1, pct: 90, rest: 5 },
    { step: 9, sets: 1, reps: 1, pct: 100, rest: null, note: 'Test massimale' },
  ],
};

// Fase 1: Squat e Stacco al 70% del massimale, tutto il resto al 100% dell'RM rilevato.
export const PHASE1 = { oneRM: 0.7, rm: 1 };

export const KIND = {
  barbell: { label: 'Bilanciere · peso totale', short: 'Bilanciere', step: 2.5, max: 350, start: 40 },
  dumbbell: { label: 'Kg per manubrio', short: 'Manubri', step: 1, max: 80, start: 10 },
  cable: { label: 'Pacco pesi', short: 'Cavo', step: 2.5, max: 200, start: 25 },
  machine: { label: 'Carico macchina', short: 'Macchina', step: 2.5, max: 400, start: 40 },
  body: { label: 'Sovraccarico · 0 = corpo libero', short: 'Corpo libero', step: 1, max: 100, start: 0 },
};

const BARBELL = ['Squat', 'Stacco', 'Stacco rumeno bilanciere', 'Hip thrust'];
const BODY = ['Sit up a terra', 'Hyperextension'];

function kindOf(name) {
  if (BARBELL.includes(name)) return 'barbell';
  if (BODY.includes(name)) return 'body';
  if (/manubri|manubrio/i.test(name)) return 'dumbbell';
  if (/cavo|pulley|lat machine/i.test(name)) return 'cable';
  return 'machine';
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ°]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const SCHEDE = RAW.map((s) => {
  let n = 0;
  const groups = s.groups.map(([name, list]) => ({
    name,
    exercises: list.map(([exName, testReps, sets, reps]) => ({
      id: `${s.id}-${slug(exName)}`,
      scheda: s.id,
      group: name,
      name: exName,
      testReps,
      sets,
      reps,
      n: ++n,
      oneRM: testReps === 1,
      kind: kindOf(exName),
    })),
  }));
  const exercises = groups.flatMap((g) => g.exercises);
  return {
    id: s.id,
    workout: s.workout,
    groups,
    exercises,
    totalSets: exercises.reduce((a, e) => a + e.sets, 0),
  };
});

export const ALL = SCHEDE.flatMap((s) => s.exercises);
export const EX = Object.fromEntries(ALL.map((e) => [e.id, e]));
export const schedaById = (id) => SCHEDE.find((s) => s.id === id);
export const LETTERS = SCHEDE.map((s) => s.id);

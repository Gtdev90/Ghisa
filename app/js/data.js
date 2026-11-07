// Programma di allenamento multi-profilo: Gianluca (Uomo) & Stefania (Donna).
// I dati e gli schemi rimangono rigorosamente isolati e separati nel rispettivo profilo.

export const PROFILES = [
  { id: 'gianluca', name: 'Gianluca', subtitle: 'Scheda Uomo · Ipertrofia & Forza', gender: 'uomo' },
  { id: 'stefania', name: 'Stefania', subtitle: 'Scheda Donna · PHA Ricomposizione', gender: 'donna' },
];

// =========================================================================
// 1. PROGRAMMA GIANLUCA (UOMO) — Upper / Lower su 4 giorni
// I 3 Grandi Fondamentali a 1RM (Panca, Squat, Stacco) @ 70% 4x5 + Tensione Meccanica
// =========================================================================
const RAW_GIANLUCA = [
  {
    id: 'A', workout: 1, groups: [
      ['Petto', [
        ['Panca piana bilanciere', 1, 4, 5],
        ['Spinte manubri su panca 30°', 10, 3, 8],
      ]],
      ['Schiena', [
        ['Rematore bilanciere', 10, 3, 8],
        ['Lat machine presa larga', 10, 3, 8],
      ]],
      ['Spalle', [
        ['Alzate laterali manubri in piedi', 12, 3, 10],
      ]],
      ['Braccia', [
        ['French press manubri su panca piana', 10, 3, 8],
        ['Curl manubri in piedi', 10, 3, 8],
      ]],
    ],
  },
  {
    id: 'B', workout: 2, groups: [
      ['Gambe/glutei', [
        ['Squat', 1, 4, 5],
        ['Stacco rumeno bilanciere', 10, 3, 8],
        ['Leg press', 10, 3, 8],
        ['Leg extension', 12, 3, 10],
        ['Leg curl', 12, 3, 10],
        ['Calf raise in piedi', 14, 3, 12],
      ]],
      ['Addome', [
        ['Crunch in ginocchio al cavo alto', 14, 3, 12],
      ]],
    ],
  },
  {
    id: 'C', workout: 3, groups: [
      ['Spalle', [
        ['Lento avanti bilanciere', 10, 4, 8],
        ['Alzate posteriori a 90°', 12, 3, 12],
      ]],
      ['Schiena', [
        ['Lat machine presa inversa', 10, 4, 8],
        ['Pulley machine triangolo', 10, 3, 10],
      ]],
      ['Petto', [
        ['Spinte manubri su panca piana', 10, 3, 8],
        ['Croci ai cavi', 12, 3, 12],
      ]],
      ['Braccia', [
        ['Curl manubri su panca 45°', 12, 3, 10],
        ['Push down corda al cavo alto', 12, 3, 10],
      ]],
    ],
  },
  {
    id: 'D', workout: 4, groups: [
      ['Catena posteriore', [
        ['Stacco', 1, 4, 5],
      ]],
      ['Gambe/glutei', [
        ['Affondi manubri', 10, 3, 8],
        ['Leg curl', 10, 3, 10],
        ['Leg extension', 12, 3, 10],
        ['Calf raise seduto', 14, 3, 15],
      ]],
      ['Addome', [
        ['Sit up a terra', 14, 3, 12],
      ]],
    ],
  },
];

const JS_PAIRS_GIANLUCA = {
  A: [
    ['A-french-press-manubri-su-panca-piana', 'A-curl-manubri-in-piedi', 'JS1'],
  ],
  B: [
    ['B-leg-extension', 'B-leg-curl', 'JS1'],
  ],
  C: [
    ['C-curl-manubri-su-panca-45', 'C-push-down-corda-al-cavo-alto', 'JS1'],
    ['C-pulley-machine-triangolo', 'C-croci-ai-cavi', 'JS2'],
  ],
  D: [
    ['D-leg-extension', 'D-leg-curl', 'JS1'],
  ],
};

// =========================================================================
// 2. PROGRAMMA STEFANIA (DONNA) — PHA Jump Sets su 4 giorni
// Alternanza Gambe + Parte Superiore per smaltire il grasso viscerale
// Zero ridondanza braccia, zero doppioni petto/spalle.
// =========================================================================
const RAW_STEFANIA = [
  {
    id: 'A', workout: 1, groups: [
      ['Quadricipiti & Spinta', [
        ['Squat', 10, 3, 8],
        ['Lat machine presa larga', 10, 3, 8],
        ['Stacco rumeno bilanciere', 10, 3, 8],
        ['Spinte manubri su panca piana', 10, 3, 8],
        ['Leg extension', 12, 3, 12],
        ['Alzate laterali manubri in piedi', 12, 3, 12],
      ]],
      ['Glutei', [
        ['Hip thrust', 10, 3, 10],
      ]],
    ],
  },
  {
    id: 'B', workout: 2, groups: [
      ['Catena Posteriore & Spalle', [
        ['Leg press', 10, 3, 10],
        ['Rematore t bar triangolo', 10, 3, 8],
        ['Leg curl', 12, 3, 10],
        ['Spinte in alto manubri seduto', 10, 3, 10],
        ['Hyperextension', 12, 3, 12],
        ['Pulley machine triangolo', 10, 3, 10],
      ]],
      ['Addome', [
        ['Crunch in ginocchio al cavo alto', 14, 3, 12],
      ]],
    ],
  },
  {
    id: 'C', workout: 3, groups: [
      ['Catena Posteriore', [
        ['Stacco', 1, 3, 6],
      ]],
      ['Glutei & Postura', [
        ['Affondi manubri', 10, 3, 10],
        ['Alzate posteriori manubri a 90°', 12, 3, 12],
        ['Hip thrust', 10, 3, 10],
        ['Lat machine presa inversa', 10, 3, 8],
      ]],
      ['Braccia', [
        ['Push down corda al cavo alto', 12, 3, 12],
        ['Curl manubri in piedi', 10, 3, 10],
      ]],
    ],
  },
  {
    id: 'D', workout: 4, groups: [
      ['Monolaterale & Glutei', [
        ['Squat bulgaro manubri', 10, 3, 8],
        ['Rematore manubrio', 10, 3, 8],
        ['Abductor machine', 14, 3, 15],
        ['Alzate laterali su panca 45°', 12, 3, 12],
        ['Hyperextension', 12, 3, 12],
        ['Lat machine triangolo', 10, 3, 10],
      ]],
      ['Addome', [
        ['Sit up a terra', 14, 3, 12],
      ]],
    ],
  },
];

const JS_PAIRS_STEFANIA = {
  A: [
    ['A-squat', 'A-lat-machine-presa-larga', 'JS1'],
    ['A-stacco-rumeno-bilanciere', 'A-spinte-manubri-su-panca-piana', 'JS2'],
    ['A-leg-extension', 'A-alzate-laterali-manubri-in-piedi', 'JS3'],
  ],
  B: [
    ['B-leg-press', 'B-rematore-t-bar-triangolo', 'JS1'],
    ['B-leg-curl', 'B-spinte-in-alto-manubri-seduto', 'JS2'],
    ['B-hyperextension', 'B-pulley-machine-triangolo', 'JS3'],
  ],
  C: [
    ['C-affondi-manubri', 'C-alzate-posteriori-manubri-a-90', 'JS1'],
    ['C-hip-thrust', 'C-lat-machine-presa-inversa', 'JS2'],
    ['C-push-down-corda-al-cavo-alto', 'C-curl-manubri-in-piedi', 'JS3'],
  ],
  D: [
    ['D-squat-bulgaro-manubri', 'D-rematore-manubrio', 'JS1'],
    ['D-abductor-machine', 'D-alzate-laterali-su-panca-45', 'JS2'],
    ['D-hyperextension', 'D-lat-machine-triangolo', 'JS3'],
  ],
};

// =========================================================================
// PROTOCOLLO DI TEST & PARAMETRI FISICI
// =========================================================================
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

// Fase 1: I fondamentali 1RM lavorano al 70%, tutto il resto all'RM target.
export const PHASE1 = { oneRM: 0.7, rm: 1 };

export const KIND = {
  barbell: { label: 'Bilanciere · peso totale', short: 'Bilanciere', step: 2.5, max: 350, start: 40 },
  dumbbell: { label: 'Kg per manubrio', short: 'Manubri', step: 1, max: 80, start: 10 },
  cable: { label: 'Pacco pesi', short: 'Cavo', step: 2.5, max: 200, start: 25 },
  machine: { label: 'Carico macchina', short: 'Macchina', step: 2.5, max: 400, start: 40 },
  body: { label: 'Sovraccarico · 0 = corpo libero', short: 'Corpo libero', step: 1, max: 100, start: 0 },
};

const BARBELL = ['Squat', 'Stacco', 'Stacco rumeno bilanciere', 'Panca piana bilanciere', 'Rematore bilanciere', 'Lento avanti bilanciere', 'Hip thrust'];
const BODY = ['Sit up a terra', 'Hyperextension'];

function kindOf(name) {
  if (BARBELL.includes(name)) return 'barbell';
  if (BODY.includes(name)) return 'body';
  if (/manubri|manubrio/i.test(name)) return 'dumbbell';
  if (/cavo|pulley|lat machine|croci/i.test(name)) return 'cable';
  return 'machine';
}

// Time Under Tension (TUT): Eccentrica · Pausa allungamento · Concentrica · Fermo contrazione
function tutOf(name) {
  if (/stacco rumeno|hyperextension|panca 60|panca 45|panca 30|french press/i.test(name)) return '3.0.1.0';
  if (/leg extension|leg curl|pulley|push down|alzate|croci|hip thrust|abductor/i.test(name)) return '2.0.1.1';
  if (/sit up|crunch|calf/i.test(name)) return '2.1.1.1';
  return '2.0.1.0';
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ°]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// =========================================================================
// GESTIONE REATTIVA DEL PROFILO ATTIVO
// In-place mutation degli array/oggetti esportati: mantiene l'identità dei riferimenti
// =========================================================================
export let CURRENT_PROFILE = 'gianluca';

export const SCHEDE = [];
export const ALL = [];
export const EX = {};
export const LETTERS = [];

export function setProfile(id = 'gianluca') {
  CURRENT_PROFILE = id;
  const raw = id === 'stefania' ? RAW_STEFANIA : RAW_GIANLUCA;
  const jsPairs = id === 'stefania' ? JS_PAIRS_STEFANIA : JS_PAIRS_GIANLUCA;

  const schede = raw.map((s) => {
    let n = 0;
    const groups = s.groups.map(([name, list]) => ({
      name,
      exercises: list.map(([exName, testReps, sets, reps]) => {
        const exId = `${s.id}-${slug(exName)}`;
        const jsInfo = (jsPairs[s.id] || []).find(([a, b]) => a === exId || b === exId);
        const js = jsInfo ? jsInfo[2] : null;
        const jsPartner = jsInfo ? (jsInfo[0] === exId ? jsInfo[1] : jsInfo[0]) : null;
        return {
          id: exId,
          scheda: s.id,
          group: name,
          name: exName,
          testReps,
          sets,
          reps,
          n: ++n,
          oneRM: testReps === 1,
          kind: kindOf(exName),
          tut: tutOf(exName),
          js,
          jsPartner,
        };
      }),
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

  const all = schede.flatMap((s) => s.exercises);
  const ex = Object.fromEntries(all.map((e) => [e.id, e]));
  const letters = schede.map((s) => s.id);

  SCHEDE.length = 0;
  SCHEDE.push(...schede);

  ALL.length = 0;
  ALL.push(...all);

  for (const k of Object.keys(EX)) delete EX[k];
  Object.assign(EX, ex);

  LETTERS.length = 0;
  LETTERS.push(...letters);

  return { id, schede, all, ex, letters };
}

export const schedaById = (id) => SCHEDE.find((s) => s.id === id);

// Inizializza con il profilo salvato su questo smartphone, o default 'gianluca'
let initialProfile = 'gianluca';
try {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('ghisa:active_profile') : null;
  if (saved && (saved === 'gianluca' || saved === 'stefania')) {
    initialProfile = saved;
  }
} catch {}
setProfile(initialProfile);

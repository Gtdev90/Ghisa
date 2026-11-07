// Stato dell'app, persistito in localStorage. Tutto resta sul dispositivo.
// Architettura Multi-Profilo: Dati rigorosamente separati per ogni atleta.
import {
  ALL, EX, SCHEDE, LETTERS, PHASE1, schedaById, setProfile, CURRENT_PROFILE,
} from './data.js';
import { roundTo, uid } from './util.js';
import seedData from './seed.js';

const ACTIVE_PROFILE_KEY = 'ghisa:active_profile';

export const getActiveProfile = () => {
  try {
    const p = typeof localStorage !== 'undefined' ? localStorage.getItem(ACTIVE_PROFILE_KEY) : null;
    return p === 'stefania' ? 'stefania' : 'gianluca';
  } catch {
    return 'gianluca';
  }
};

let activeProfile = getActiveProfile();

export const profileStorageKey = (id) => `ghisa:profile:${id}`;

const emptyDefaults = () => ({
  v: 2,
  onboarded: false,
  phase: 'test',
  phaseAt: null,
  cycle: 1,
  meso: {
    week: 1,
    totalWeeks: 5,
    isDeload: false,
    deloadType: 'partial', // 'partial' (-1 set, -2 RPE) o 'medium' (-10% carico, 50% sets)
    startedAt: Date.now(),
  },
  settings: {
    bar: 20,
    round: 2.5,
    restMain: 180,
    restAcc: 90,
    restTest: 180,
    sound: true,
    vibrate: true,
    wake: true,
    motion: 'full', // richiesta esplicita: animazioni sempre piene; 'auto' segue il sistema
    trackRpe: true, // Registrazione RPE / RIR (RPE 9 target, RPE 10 cedimento)
    autoDrop: true, // Suggerimento intelligente drop carico su affaticamento neurale
  },
  rm: {}, // exId -> { kg, manual, manualAt, date, attempts: [{ kg, ok, t }] }
  overrides: {}, // exId -> kg di lavoro Fase 1 scelto a mano
  maxtest: {}, // exId -> { estimate, step, serie, attempts } protocollo 1RM in corso
  active: null, // sessione aperta
  timer: null, // recupero in corso { endAt, dur, label, scheda }
  history: [], // sessioni chiuse, dalla più recente
  archive: [], // cicli di test precedenti { closedAt, cycle, rm: { exId: kg } }
  acked: [], // ultimi id dei comandi dell'orologio già registrati (l'orologio li usa come conferma)
});

const defaults = (profileId = activeProfile) => {
  const base = emptyDefaults();
  // Se Stefania, pre-carica il suo storico reale salvato in seedData
  if (profileId === 'stefania' && seedData && seedData.rm && Object.keys(seedData.rm).length > 0) {
    const workouts = (seedData.history || []).filter((h) => h.type === 'workout').length;
    const currentWeek = Math.min(5, Math.floor(workouts / 4) + 1);
    return {
      ...base,
      ...seedData,
      v: 2,
      meso: {
        ...base.meso,
        week: currentWeek,
        ...(seedData.meso || {}),
      },
      settings: {
        ...base.settings,
        ...(seedData.settings || {}),
        trackRpe: seedData.settings?.trackRpe ?? true,
        autoDrop: seedData.settings?.autoDrop ?? true,
      },
    };
  }
  return base;
};

function load() {
  const d = defaults(activeProfile);
  try {
    const key = profileStorageKey(activeProfile);
    let raw = localStorage.getItem(key);

    // Migrazione legacy: se Gianluca non ha ancora la sua chiave ma esiste ghisa:v1, usala e salvala
    if (!raw && activeProfile === 'gianluca') {
      const legacy = localStorage.getItem('ghisa:v1');
      if (legacy) {
        raw = legacy;
        try { localStorage.setItem(key, legacy); } catch {}
      }
    }

    if (!raw) return d;
    const s = JSON.parse(raw);
    const workouts = (s.history || []).filter((h) => h.type === 'workout').length;
    const calculatedWeek = Math.min(5, Math.floor(workouts / 4) + 1);
    const meso = {
      week: calculatedWeek,
      totalWeeks: 5,
      isDeload: false,
      deloadType: 'partial',
      startedAt: Date.now(),
      ...(s.meso || {}),
    };
    return {
      ...d,
      ...s,
      v: 2,
      meso,
      settings: {
        ...d.settings,
        ...(s.settings || {}),
        trackRpe: s.settings?.trackRpe ?? true,
        autoDrop: s.settings?.autoDrop ?? true,
      },
    };
  } catch {
    return d;
  }
}

let state = load();
const subs = new Set();

export const S = () => state;

function persist() {
  try {
    const key = profileStorageKey(activeProfile);
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage pieno o non disponibile: l'app continua a funzionare in memoria.
  }
}

export function update(fn) {
  const out = fn(state);
  persist();
  subs.forEach((f) => f(state));
  return out;
}

export const subscribe = (f) => {
  subs.add(f);
  return () => subs.delete(f);
};

export function switchProfile(newProfileId) {
  if (newProfileId === activeProfile) return state;
  persist(); // salva i dati del profilo uscente
  activeProfile = newProfileId;
  try {
    localStorage.setItem(ACTIVE_PROFILE_KEY, newProfileId);
  } catch {}
  setProfile(newProfileId); // aggiorna schede ed esercizi reattivamente
  state = load(); // carica i dati isolati del nuovo profilo
  subs.forEach((f) => f(state));
  return state;
}

// ---------- Letture ----------

export const rmOf = (id) => {
  if (state.rm[id]?.kg != null) return state.rm[id].kg;
  // Fallback per esercizi storici spostati di scheda (es. leg-press)
  const baseSlug = id.replace(/^[A-D]-/, '');
  for (const [k, v] of Object.entries(state.rm)) {
    if (k.endsWith(baseSlug) && v?.kg != null) return v.kg;
  }
  return null;
};

export function prevRmOf(id) {
  for (const c of state.archive) if (c.rm[id] != null) return c.rm[id];
  return null;
}

export function autoLoad(ex) {
  const rm = rmOf(ex.id);
  if (rm == null) return null;
  if (ex.oneRM) return Math.max(state.settings.bar, roundTo(rm * PHASE1.oneRM, state.settings.round));
  return rm * PHASE1.rm;
}

export const workLoad = (ex) => state.overrides[ex.id] ?? autoLoad(ex);

export const doneIn = (sid) => schedaById(sid).exercises.filter((e) => rmOf(e.id) != null).length;
export const doneTotal = () => ALL.filter((e) => rmOf(e.id) != null).length;
export const allTested = () => doneTotal() === ALL.length;
export const workoutsDone = () => state.history.filter((h) => h.type === 'workout').length;
export const lastOf = (sid, type = 'workout') => state.history.find((h) => h.type === type && h.scheda === sid);

export function nextScheda() {
  if (state.active) return state.active.scheda;
  if (state.phase === 'test') return (SCHEDE.find((s) => doneIn(s.id) < s.exercises.length) || SCHEDE[0]).id;
  const last = state.history.find((h) => h.type === 'workout');
  return last ? LETTERS[(LETTERS.indexOf(last.scheda) + 1) % LETTERS.length] : 'A';
}

export function lastSetsOf(exId) {
  for (const h of state.history) {
    if (h.type !== 'workout') continue;
    const it = h.items.find((i) => i.id === exId);
    if (it?.sets.length) return it;
  }
  return null;
}

export function estMinutes(sid) {
  const { restMain, restAcc } = state.settings;
  const sec = schedaById(sid).exercises.reduce(
    (a, e) => {
      const sets = currentSetsCount(e);
      return a + sets * 40 + (sets - 1) * (e.oneRM ? restMain : restAcc) + 60;
    },
    0,
  );
  return Math.round(sec / 60 / 5) * 5;
}

export function currentSetsCount(ex) {
  if (state.phase !== 'fase1' || !state.meso?.isDeload) return ex.sets;
  if (state.meso.deloadType === 'medium') {
    return Math.max(1, Math.round(ex.sets / 2));
  }
  // Scarico parziale: -1 serie per esercizio (scarico di volume)
  return Math.max(1, ex.sets - 1);
}

export function totalSetsOf(sid) {
  return schedaById(sid).exercises.reduce((a, e) => a + currentSetsCount(e), 0);
}

export function currentTargetLoad(ex) {
  const base = workLoad(ex);
  if (base == null) return null;
  // Scarico medio: carichi abbassati del 10% (scarico di intensità)
  if (state.phase === 'fase1' && state.meso?.isDeload && state.meso.deloadType === 'medium') {
    return Math.max(state.settings.bar, roundTo(base * 0.90, state.settings.round));
  }
  return base;
}

export const todayLoad = (ex) => state.active?.loads?.[ex.id] ?? currentTargetLoad(ex);

export function targetRpe(ex, setIndex) {
  // Nello scarico parziale l'RPE cala di 2 punti (lavoro a RPE 7, buffer 3)
  if (state.meso?.isDeload && state.meso.deloadType === 'partial') return 7;
  const count = currentSetsCount(ex);
  // Ultima serie degli esercizi di isolamento/accessori a cedimento (RPE 10)
  if (setIndex === count - 1 && !ex.oneRM) return 10;
  return 9; // Target standard per serie allenanti (RIR 1)
}

// ---------- RM ----------

function recompute(r) {
  let best = r.manual ?? null;
  for (const a of r.attempts) {
    if (a.ok && (!r.manualAt || a.t > r.manualAt) && (best == null || a.kg > best)) best = a.kg;
  }
  r.kg = best;
}

function openTest(s, sid, startedAt) {
  if (s.active?.type === 'test' && s.active.scheda === sid) return;
  if (s.active) closeInto(s);
  s.active = { id: uid(), type: 'test', scheda: sid, startedAt: startedAt || Date.now(), tested: {} };
}

/** Registra un tentativo; ritorna true se è un nuovo RM. */
function attemptInto(s, exId, kgv, ok, t = Date.now(), startedAt) {
  const before = s.rm[exId]?.kg ?? null;
  const r = (s.rm[exId] ||= { kg: null, attempts: [] });
  r.attempts.push({ kg: kgv, ok, t });
  recompute(r);
  if (r.kg !== before) r.date = t;
  openTest(s, EX[exId].scheda, startedAt);
  s.active.tested[exId] = (s.active.tested[exId] || 0) + 1;
  return ok && (before == null || kgv > before);
}

export function logAttempt(exId, kgv, ok) {
  return update((s) => attemptInto(s, exId, kgv, ok));
}

export function removeAttempt(exId, t) {
  update((s) => {
    const r = s.rm[exId];
    if (!r) return;
    r.attempts = r.attempts.filter((a) => a.t !== t);
    recompute(r);
  });
}

export function setRM(exId, kgv) {
  update((s) => {
    const r = (s.rm[exId] ||= { kg: null, attempts: [] });
    r.manual = kgv;
    r.manualAt = Date.now();
    r.date = Date.now();
    recompute(r);
  });
}

export function clearRM(exId) {
  update((s) => {
    delete s.rm[exId];
    delete s.overrides[exId];
  });
}

/** Chiude il protocollo 1RM: il massimale è il miglior tentativo riuscito. */
export function registerMax(exId, best, attempts) {
  update((s) => {
    const r = (s.rm[exId] ||= { kg: null, attempts: [] });
    r.attempts.push(...attempts);
    r.manual = best;
    r.manualAt = Date.now();
    r.date = Date.now();
    recompute(r);
    openTest(s, EX[exId].scheda);
    s.active.tested[exId] = (s.active.tested[exId] || 0) + attempts.length;
    delete s.maxtest[exId];
  });
}

export function saveMaxTest(exId, mt) {
  update((s) => {
    if (mt) s.maxtest[exId] = mt;
    else delete s.maxtest[exId];
  });
}

// ---------- Sessioni ----------

function closeInto(s, opts = {}) {
  const a = s.active;
  if (!a) return null;
  s.active = null;
  s.timer = null;
  const sc = schedaById(a.scheda);
  let entry;
  if (a.type === 'workout') {
    const items = sc.exercises
      .map((e) => ({ id: e.id, name: e.name, sets: (a.sets[e.id] || []).filter(Boolean) }))
      .filter((i) => i.sets.length);
    if (!items.length) return null;
    const all = items.flatMap((i) => i.sets);
    const withRpe = all.filter((x) => x.rpe);
    const avgRpe = withRpe.length ? +(withRpe.reduce((acc, x) => acc + x.rpe, 0) / withRpe.length).toFixed(1) : null;
    entry = {
      id: a.id,
      type: 'workout',
      scheda: a.scheda,
      workout: sc.workout,
      startedAt: a.startedAt,
      endedAt: opts.endedAt || Date.now(),
      ...(opts.hr ? { hr: opts.hr } : {}),
      items,
      sets: all.length,
      reps: all.reduce((x, y) => x + y.reps, 0),
      volume: Math.round(all.reduce((x, y) => x + y.reps * y.kg, 0)),
      avgRpe,
      week: s.meso?.week ?? 1,
      isDeload: !!s.meso?.isDeload,
    };
    if (s.phase === 'fase1' && !s.meso.isDeload) {
      const pastWorkouts = s.history.filter((h) => h.type === 'workout');
      if ((pastWorkouts.length + 1) % 4 === 0) {
        s.meso.week = Math.min(s.meso.totalWeeks, s.meso.week + 1);
      }
    }
  } else {
    const ids = Object.keys(a.tested || {});
    if (!ids.length) return null;
    const items = ids.map((id) => ({
      id,
      name: EX[id].name,
      testReps: EX[id].testReps,
      rm: s.rm[id]?.kg ?? null,
      attempts: a.tested[id],
    }));
    entry = {
      id: a.id,
      type: 'test',
      scheda: a.scheda,
      startedAt: a.startedAt,
      endedAt: opts.endedAt || Date.now(),
      items,
      sets: items.reduce((x, i) => x + i.attempts, 0),
      found: items.filter((i) => i.rm != null).length,
    };
  }
  s.history.unshift(entry);
  return entry.id;
}

function openWorkout(s, sid, startedAt) {
  if (s.active?.type === 'workout' && s.active.scheda === sid) return;
  if (s.active) closeInto(s);
  s.active = { id: uid(), type: 'workout', scheda: sid, startedAt: startedAt || Date.now(), sets: {}, loads: {} };
}

export function startWorkout(sid) {
  update((s) => {
    if (s.active) closeInto(s);
    openWorkout(s, sid);
  });
}

/**
 * Applica un comando arrivato dall'orologio. Idempotente (l'id viene ricordato) e ripetibile in ordine
 * temporale, così le serie segnate con il telefono in tasca vengono registrate al risveglio dell'app.
 * Ritorna il comando se è stato applicato, altrimenti null.
 */
export function remoteApply(c) {
  return update((s) => {
    if (!c?.id || s.acked.includes(c.id)) return null;
    s.acked = [...s.acked, c.id].slice(-60);
    switch (c.type) {
      case 'start':
        openWorkout(s, c.scheda, c.startedAt || c.t);
        break;
      case 'set': {
        if (!EX[c.ex]) break;
        openWorkout(s, c.scheda, c.startedAt || c.t);
        (s.active.sets[c.ex] ||= [])[c.i] = { reps: c.reps, kg: c.kg, rpe: c.rpe || 9, t: c.t };
        break;
      }
      case 'unset':
        if (s.active?.type === 'workout' && s.active.sets[c.ex]) s.active.sets[c.ex][c.i] = null;
        break;
      case 'finish':
        if (s.active?.type === 'workout') closeInto(s, { endedAt: c.endedAt || c.t, hr: c.hr });
        break;
      case 'discard':
        s.active = null;
        s.timer = null;
        break;
      case 'attempt':
        if (EX[c.ex]) attemptInto(s, c.ex, c.kg, !!c.ok, c.t, c.startedAt || c.t);
        break;
      case 'closeTest':
        if (s.active?.type === 'test') closeInto(s);
        break;
      default:
    }
    return c;
  });
}

export const finishSession = () => update((s) => closeInto(s));

export function discardSession() {
  update((s) => {
    s.active = null;
    s.timer = null;
  });
}

export function doSet(exId, i, rec) {
  update((s) => {
    (s.active.sets[exId] ||= [])[i] = rec;
  });
}

export function undoSet(exId, i) {
  update((s) => {
    const arr = s.active?.sets[exId];
    if (arr) arr[i] = null;
  });
}

export function setTodayLoad(exId, kgv) {
  update((s) => {
    if (s.active) s.active.loads[exId] = kgv;
  });
}

export function deleteHistory(id) {
  update((s) => {
    s.history = s.history.filter((h) => h.id !== id);
  });
}

// ---------- Fasi, impostazioni, backup ----------

export function enterPhase1() {
  update((s) => {
    s.phase = 'fase1';
    s.phaseAt = Date.now();
  });
}

export function newCycle() {
  update((s) => {
    if (s.active) closeInto(s);
    const rm = {};
    for (const [id, r] of Object.entries(s.rm)) if (r.kg != null) rm[id] = r.kg;
    s.archive.unshift({ closedAt: Date.now(), cycle: s.cycle, rm });
    s.rm = {};
    s.overrides = {};
    s.maxtest = {};
    s.phase = 'test';
    s.phaseAt = null;
    s.cycle += 1;
  });
}

export const setOnboarded = () => update((s) => { s.onboarded = true; });
export const setSetting = (k, v) => update((s) => { s.settings[k] = v; });
export const setTimer = (t) => update((s) => { s.timer = t; });

export function setOverride(exId, kgv) {
  update((s) => {
    if (kgv == null) delete s.overrides[exId];
    else s.overrides[exId] = kgv;
  });
}

export function resetAll() {
  state = defaults();
  persist();
  subs.forEach((f) => f(state));
}

export function toggleDeload(force) {
  return update((s) => {
    s.meso.isDeload = force !== undefined ? !!force : !s.meso.isDeload;
  });
}

export function setDeloadType(type) {
  return update((s) => {
    s.meso.deloadType = type;
  });
}

export function setWeek(w) {
  return update((s) => {
    s.meso.week = Math.max(1, Math.min(s.meso.totalWeeks, w));
  });
}

export function statsByMuscleGroup(days = 7) {
  const since = Date.now() - days * 864e5;
  const stats = {};
  for (const h of state.history) {
    if (h.type !== 'workout' || h.endedAt < since) continue;
    for (const item of h.items) {
      const ex = EX[item.id];
      if (!ex) continue;
      const g = ex.group;
      stats[g] = stats[g] || { sets: 0, volume: 0, reps: 0 };
      const validSets = item.sets.filter(Boolean);
      stats[g].sets += validSets.length;
      stats[g].volume += validSets.reduce((a, s) => a + s.reps * s.kg, 0);
      stats[g].reps += validSets.reduce((a, s) => a + s.reps, 0);
    }
  }
  return stats;
}

export function exportState() {
  return JSON.stringify({
    ...state,
    athlete: activeProfile,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importState(obj) {
  if (!obj || typeof obj !== 'object' || (obj.v !== 1 && obj.v !== 2) || typeof obj.rm !== 'object' || !Array.isArray(obj.history)) {
    throw new Error('File non valido');
  }
  const d = defaults(activeProfile);
  state = {
    ...d,
    ...obj,
    v: 2,
    meso: { ...d.meso, ...(obj.meso || {}) },
    settings: { ...d.settings, ...(obj.settings || {}) },
    timer: null,
  };
  delete state.exportedAt;
  delete state.athlete;
  persist();
  subs.forEach((f) => f(state));
}

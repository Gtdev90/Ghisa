// Stato dell'app, persistito in localStorage. Tutto resta sul dispositivo.
import { ALL, EX, SCHEDE, LETTERS, PHASE1, schedaById } from './data.js';
import { roundTo, uid } from './util.js';

const KEY = 'ghisa:v1';

const defaults = () => ({
  v: 1,
  onboarded: false,
  phase: 'test',
  phaseAt: null,
  cycle: 1,
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

function load() {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const s = JSON.parse(raw);
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch {
    return d;
  }
}

let state = load();
const subs = new Set();

export const S = () => state;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
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

// ---------- Letture ----------

export const rmOf = (id) => state.rm[id]?.kg ?? null;

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
    (a, e) => a + e.sets * 40 + (e.sets - 1) * (e.oneRM ? restMain : restAcc) + 60,
    0,
  );
  return Math.round(sec / 60 / 5) * 5;
}

export const todayLoad = (ex) => state.active?.loads?.[ex.id] ?? workLoad(ex);

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
    };
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
        (s.active.sets[c.ex] ||= [])[c.i] = { reps: c.reps, kg: c.kg, t: c.t };
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

export function exportState() {
  return JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
}

export function importState(obj) {
  if (!obj || typeof obj !== 'object' || obj.v !== 1 || typeof obj.rm !== 'object' || !Array.isArray(obj.history)) {
    throw new Error('File non valido');
  }
  const d = defaults();
  state = { ...d, ...obj, settings: { ...d.settings, ...(obj.settings || {}) }, timer: null };
  delete state.exportedAt;
  persist();
  subs.forEach((f) => f(state));
}

// Sincronizzazione con l'orologio Wear OS.
//
//  telefono -> orologio : a ogni cambio di stato si pubblica un'istantanea (schede, carichi, sessione, recupero).
//  orologio -> telefono : comandi (serie fatta, inizio/fine allenamento, tentativi RM) accodati dal servizio
//                         nativo anche con l'app chiusa; qui si ritirano e si applicano in ordine temporale.
//
// Il formato dell'istantanea e dei comandi è letto da android/wear/.../Model.kt.
import { Watch, AppPlugin } from './native.js';
import { S, subscribe, remoteApply, todayLoad, rmOf, nextScheda } from './store.js';
import { SCHEDE, KIND } from './data.js';
import { refresh, currentPath } from './nav.js';

export const watchSupported = !!Watch;

const mapSets = (sets) => Object.fromEntries(
  Object.entries(sets || {}).map(([id, arr]) => [id, arr.map((r) => (r ? { reps: r.reps, kg: r.kg } : null))]),
);

export function buildSnapshot() {
  const st = S();
  const a = st.active;
  const set = st.settings;
  return {
    phase: st.phase,
    cycle: st.cycle,
    settings: {
      restMain: set.restMain, restAcc: set.restAcc, restTest: set.restTest, vibrate: set.vibrate, bar: set.bar,
    },
    next: nextScheda(),
    acked: st.acked || [],
    active: a ? {
      type: a.type,
      scheda: a.scheda,
      startedAt: a.startedAt,
      sets: a.type === 'workout' ? mapSets(a.sets) : {},
      tested: a.tested || {},
    } : null,
    timer: st.timer ? { endAt: st.timer.endAt, dur: st.timer.dur, label: st.timer.label || '' } : null,
    schede: SCHEDE.map((s) => ({
      id: s.id,
      workout: s.workout,
      exercises: s.exercises.map((e) => ({
        id: e.id,
        scheda: e.scheda,
        name: e.name,
        group: e.group,
        sets: e.sets,
        reps: e.reps,
        testReps: e.testReps,
        oneRM: e.oneRM,
        kind: e.kind,
        kg: todayLoad(e),
        rm: rmOf(e.id),
        step: KIND[e.kind].step,
        n: e.n,
      })),
    })),
  };
}

let lastSent = '';
let timer = 0;
let pausedUntil = 0; // se la Data Layer non c'è (nessun orologio/app Wear OS), si riprova con calma
const isUnavailable = (msg) => /not available|API_UNAVAILABLE/i.test(String(msg || ''));

async function push(force = false) {
  if (!force && Date.now() < pausedUntil) return;
  const snap = buildSnapshot();
  const key = JSON.stringify(snap);
  if (!force && key === lastSent) return;
  lastSent = key;
  try {
    await Watch.push({ state: JSON.stringify({ rev: Date.now(), ...snap }) });
  } catch (e) {
    lastSent = ''; // riproverà al prossimo cambio
    if (isUnavailable(e?.message || e)) pausedUntil = Date.now() + 60_000;
  }
}

const schedulePush = () => {
  clearTimeout(timer);
  timer = setTimeout(() => push(), 350);
};

let draining = false;

/** Ritira i comandi dell'orologio e li applica. */
export async function drain() {
  if (!Watch || draining) return;
  draining = true;
  try {
    const { cmds = [] } = await Watch.drain();
    const applied = [];
    for (const raw of cmds) {
      let c;
      try { c = JSON.parse(raw); } catch { continue; }
      if (remoteApply(c)) applied.push(c);
    }
    if (applied.length) {
      window.dispatchEvent(new CustomEvent('ghisa:remote', { detail: applied }));
      const path = currentPath();
      if (/^\/(test\/|massimali|diario)?$/.test(path) || path.startsWith('/test/') || path.startsWith('/rm/')) refresh();
      push(true);
    }
  } finally {
    draining = false;
  }
}

export async function watchStatus() {
  if (!Watch) return { supported: false, connected: false, nodes: [] };
  try {
    const r = await Watch.status();
    return { supported: true, connected: !!r.connected, nodes: r.nodes || [], unavailable: isUnavailable(r.error) };
  } catch {
    return { supported: true, connected: false, nodes: [] };
  }
}

export const watchSendNow = () => (Watch ? push(true) : Promise.resolve());

export function initWatch() {
  if (!Watch) return;
  subscribe(schedulePush);
  Watch.addListener('watchCmd', () => drain());
  AppPlugin?.addListener('resume', () => { drain(); push(true); });
  drain().then(() => push(true));
}

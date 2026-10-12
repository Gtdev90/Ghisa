import { isNative, Haptics, KeepAwake, Filesystem, Share } from './native.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ENT = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ENT[c]);

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const roundTo = (x, step) => +(Math.round(x / step) * step).toFixed(2);
export const pad = (n) => String(n).padStart(2, '0');
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const nf = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
export const kg = (n) => (n == null || Number.isNaN(n) ? '—' : nf.format(n));
export const int = (n) => nf0.format(Math.round(n || 0));

export const clock = (sec) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

export const elapsed = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
};

export const minutes = (ms) => Math.max(1, Math.round(ms / 60000));

const dfDay = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
const dfMonth = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' });
const dfShortMonth = new Intl.DateTimeFormat('it-IT', { month: 'short' });
export const dayLabel = (t) => dfDay.format(t);
export const monthLabel = (t) => dfMonth.format(t);
export const shortMonth = (t) => dfShortMonth.format(t).replace('.', '');

// Dischi disponibili (kg) e scomposizione per lato del bilanciere.
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export function plates(total, bar) {
  let side = (total - bar) / 2;
  const out = [];
  if (side <= 0) return { side: out, rest: 0 };
  for (const p of PLATES) {
    while (side >= p - 1e-9) {
      out.push(p);
      side = +(side - p).toFixed(3);
    }
  }
  return { side: out, rest: side };
}

// --- Feedback fisico: vibrazione, suono, schermo acceso ---
let audio;
export function unlockAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!audio) audio = new AC();
  if (audio.state === 'suspended') audio.resume();
}

export function beep(seq = [[660, 0.09], [0, 0.07], [660, 0.09], [0, 0.07], [990, 0.32]]) {
  if (!audio) return;
  let t = audio.currentTime + 0.02;
  for (const [f, d] of seq) {
    if (f) {
      const o = audio.createOscillator();
      const g = audio.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(audio.destination);
      o.start(t);
      o.stop(t + d + 0.03);
    }
    t += d;
  }
}

let vibrateOn = true;
export const setVibrate = (on) => { vibrateOn = on; };
export function buzz(p) {
  if (!vibrateOn) return;
  if (!isNative) {
    navigator.vibrate?.(p);
    return;
  }
  // Nell'APK la vibrazione passa dal motore aptico nativo: tic leggeri per il metro, impulsi per il resto.
  const fire = (d) => (d <= 12 ? Haptics.impact({ style: 'LIGHT' }) : Haptics.vibrate({ duration: d })).catch(() => {});
  if (!Array.isArray(p)) {
    fire(p);
    return;
  }
  let t = 0;
  p.forEach((d, i) => {
    if (i % 2 === 0) setTimeout(() => fire(d), t);
    t += d;
  });
}

let lock = null;
let wantLock = false;
export async function keepAwake(on) {
  if (isNative) {
    if (on !== wantLock) (on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {});
    wantLock = on;
    return;
  }
  wantLock = on;
  if (!('wakeLock' in navigator)) return;
  try {
    if (on && !lock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) {
      await lock.release();
      lock = null;
    }
  } catch {
    lock = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (!isNative && document.visibilityState === 'visible' && wantLock) keepAwake(true);
});

/** Salva un file: nel browser lo scarica, nell'APK lo scrive in cache e apre il menu Condividi. */
export async function download(name, text) {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: 'CACHE', encoding: 'utf8' });
    await Share.share({ title: name, files: [uri], dialogTitle: 'Salva il backup di GHISA' });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

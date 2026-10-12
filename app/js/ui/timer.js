// Recupero: quadrante a tutto schermo che si riduce a capsula. Il tempo è calcolato su un
// timestamp di fine, quindi resta esatto anche se lo schermo si spegne o l'app viene ricaricata.
import { gsap, punch, reduced } from '../anim.js';
import { S, setTimer } from '../store.js';
import { clock, beep, buzz, esc } from '../util.js';
import { pushLayer } from '../nav.js';

let full = null;
let pill = null;
let release = null;
let raf = 0;
let lastSec = -1;
let ending = false;

const R = 100;
const BEZEL = 2 * Math.PI * 112;

export function startRest(sec, { label = '', scheda } = {}) {
  ending = false;
  setTimer({ endAt: Date.now() + sec * 1000, dur: sec, label, scheda });
  lastSec = -1;
  expand(true);
  loop();
}

/** All'avvio: se c'era un recupero ancora in corso lo riprende come capsula. */
export function resumeTimer() {
  const t = S().timer;
  if (!t) return;
  if (t.endAt <= Date.now()) {
    setTimer(null);
    return;
  }
  showPill();
  loop();
}

export function stopTimer() {
  ending = true;
  setTimer(null);
  collapse();
  hidePill();
}

function loop() {
  cancelAnimationFrame(raf);
  const tick = () => {
    const t = S().timer;
    if (!t) return;
    const rem = Math.max(0, (t.endAt - Date.now()) / 1000);
    paint(rem, t);
    if (rem <= 0) {
      done();
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
}

function paint(rem, t) {
  const frac = t.dur ? Math.min(1, rem / t.dur) : 0;
  const sec = Math.ceil(rem);
  for (const root of [full, pill]) {
    if (!root) continue;
    const prog = root.querySelector('.rr-prog');
    if (prog && !root._intro) gsap.set(prog, { drawSVG: `0% ${Math.max(0.001, frac * 100)}%` });
    if (sec !== lastSec) root.querySelector('[data-time]').textContent = clock(rem);
  }
  if (sec !== lastSec) {
    if (full && sec <= 3 && sec > 0 && lastSec !== -1) {
      punch(full.querySelector('[data-time]'), 1.07);
      buzz(25);
    }
    lastSec = sec;
  }
}

function done() {
  if (ending) return;
  ending = true;
  if (S().settings.sound) beep();
  buzz([180, 90, 180, 90, 420]);
  setTimer(null);
  if (full) {
    const timeEl = full.querySelector('[data-time]');
    timeEl.textContent = 'Via';
    full.classList.add('is-go');
    gsap.fromTo(timeEl, { scale: 0.55 }, { scale: 1, duration: 0.8, ease: 'back.out(3)' });
    gsap.fromTo(full.querySelector('.rest-flash'), { opacity: 0.55 }, { opacity: 0, duration: 1.2, ease: 'power2.out' });
    gsap.set(full.querySelector('.rr-prog'), { drawSVG: '0% 100%' });
    setTimeout(() => collapse(), 1500);
  } else if (pill) {
    pill.classList.add('is-go');
    pill.querySelector('[data-time]').textContent = 'Via';
    punch(pill, 1.15);
    setTimeout(hidePill, 3200);
  }
}

function adjust(delta) {
  const t = S().timer;
  if (!t) return;
  const endAt = t.endAt + delta * 1000;
  const rem = (endAt - Date.now()) / 1000;
  if (rem <= 0.5) {
    stopTimer();
    return;
  }
  setTimer({ ...t, endAt, dur: Math.max(t.dur, rem) });
  lastSec = -1;
  if (full) punch(full.querySelector('[data-time]'), delta > 0 ? 1.08 : 0.94);
}

function expand(fresh = false) {
  const t = S().timer;
  if (!t || full) return;
  hidePill(true);
  const root = document.getElementById('layers');
  full = document.createElement('div');
  full.className = 'rest';
  full.dataset.s = t.scheda || '';
  full.setAttribute('role', 'dialog');
  full.setAttribute('aria-label', 'Recupero');
  full.innerHTML = `
    <div class="rest-bg"></div><div class="rest-flash"></div>
    <div class="rest-in">
      <div class="rest-top">
        <span class="mono"><i class="rec-dot"></i>Recupero</span>
        <button class="icon-btn" data-act="min" aria-label="Riduci a capsula" data-press><svg class="ico"><use href="#i-down"/></svg></button>
      </div>
      <div class="rest-dial">
        <svg class="rest-ring" viewBox="0 0 240 240" aria-hidden="true">
          <circle class="rr-bezel" cx="120" cy="120" r="112" stroke-dasharray="1.6 ${(BEZEL / 60 - 1.6).toFixed(3)}"/>
          <circle class="rr-track" cx="120" cy="120" r="${R}"/>
          <circle class="rr-prog" cx="120" cy="120" r="${R}" transform="rotate(-90 120 120)"/>
        </svg>
        <div class="rest-time num" data-time>${clock((t.endAt - Date.now()) / 1000)}</div>
        <div class="rest-of mono">su ${clock(t.dur)}</div>
      </div>
      <div class="rest-label">${esc(t.label)}</div>
      <div class="rest-actions">
        <button class="btn btn-ghost" data-act="minus" data-press>−15″</button>
        <button class="btn btn-chalk" data-act="skip" data-press><svg class="ico"><use href="#i-skip"/></svg>Salta</button>
        <button class="btn btn-ghost" data-act="plus" data-press>+15″</button>
      </div>
    </div>`;
  root.appendChild(full);
  const el = full;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'min') collapse();
    else if (a === 'skip') stopTimer();
    else if (a === 'plus') adjust(15);
    else if (a === 'minus') adjust(-15);
  });

  const prog = el.querySelector('.rr-prog');
  const rem = Math.max(0, (t.endAt - Date.now()) / 1000);
  const frac = rem / t.dur;
  const tl = gsap.timeline();
  tl.fromTo(el.querySelector('.rest-bg'), { opacity: 0 }, { opacity: 1, duration: 0.35 }, 0);
  if (!reduced) {
    el._intro = true;
    tl.fromTo(el.querySelector('.rest-dial'), { scale: 0.82, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8, ease: 'lift' }, 0.05)
      .fromTo(el.querySelector('.rr-bezel'), { rotate: -40, svgOrigin: '120 120', opacity: 0 }, { rotate: 0, opacity: 1, duration: 1.1, ease: 'out' }, 0.05)
      .fromTo(prog, { drawSVG: '0% 0%' }, { drawSVG: `0% ${frac * 100}%`, duration: fresh ? 0.9 : 0.5, ease: 'io', onComplete: () => { el._intro = false; } }, 0.1)
      .from(el.querySelectorAll('.rest-label, .rest-actions > *, .rest-top'), { y: 20, opacity: 0, stagger: 0.05, duration: 0.6 }, 0.15);
  }
  release = pushLayer(() => collapse(true));
}

function collapse(fromBack = false) {
  const el = full;
  if (!el) return;
  full = null;
  if (!fromBack && release) release();
  release = null;
  gsap.timeline({ onComplete: () => el.remove() })
    .to(el.querySelector('.rest-in'), { y: -40, scale: 0.9, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
    .to(el.querySelector('.rest-bg'), { opacity: 0, duration: 0.4 }, 0.1);
  if (S().timer) showPill();
}

function showPill() {
  const t = S().timer;
  if (!t || pill) return;
  pill = document.createElement('button');
  pill.className = 'rest-pill';
  pill.dataset.s = t.scheda || '';
  pill.setAttribute('aria-label', 'Apri il recupero');
  pill.innerHTML = `<svg viewBox="0 0 240 240" aria-hidden="true"><circle class="rr-track" cx="120" cy="120" r="${R}"/><circle class="rr-prog" cx="120" cy="120" r="${R}" transform="rotate(-90 120 120)"/></svg>
    <span class="num" data-time>${clock((t.endAt - Date.now()) / 1000)}</span><span class="mono">recupero</span>`;
  pill.addEventListener('click', () => {
    if (S().timer) expand();
  });
  document.getElementById('layers').appendChild(pill);
  document.documentElement.classList.add('has-pill');
  lastSec = -1;
  gsap.fromTo(pill, { y: -60, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.7, ease: 'lift', delay: 0.15 });
}

function hidePill(instant = false) {
  const el = pill;
  if (!el) return;
  pill = null;
  document.documentElement.classList.remove('has-pill');
  if (instant) {
    el.remove();
    return;
  }
  gsap.to(el, { y: -50, scale: 0.7, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: () => el.remove() });
}

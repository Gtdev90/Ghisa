// Recupero: quadrante a tutto schermo che si riduce a capsula. Il tempo è calcolato su un
// timestamp di fine, quindi resta esatto anche se lo schermo si spegne o l'app viene ricaricata.
import { gsap, punch, reduced } from '../anim.js';
import { S, setTimer } from '../store.js';
import { clock, beep, buzz, esc, unlockAudio } from '../util.js';
import { pushLayer, go, currentPath } from '../nav.js';
import { toast } from './sheet.js';

let full = null;
let pill = null;
let release = null;
let raf = 0;
let timeoutId = null;
let lastSec = -1;
let ending = false;
let expiredAlert = null; // { scheda, label }

const R = 100;
const BEZEL = 2 * Math.PI * 112;

export function startRest(sec, { label = '', scheda, endAt } = {}) {
  ending = false;
  expiredAlert = null;
  const s = scheda || S().active?.scheda || '';
  const finalEndAt = endAt || (Date.now() + sec * 1000);
  const rem = (finalEndAt - Date.now()) / 1000;
  if (rem <= 0) return;
  setTimer({ endAt: finalEndAt, dur: sec, label, scheda: s });
  lastSec = -1;
  scheduleTimeout(rem * 1000);
  expand(true);
  loop();
}

/** All'avvio: se c'era un recupero ancora in corso lo riprende come capsula. */
export function resumeTimer() {
  const t = S().timer;
  if (!t) {
    syncTimerPill();
    return;
  }
  const rem = t.endAt - Date.now();
  if (rem <= 0) {
    done();
    return;
  }
  scheduleTimeout(rem);
  showPill();
  loop();
}

export function stopTimer() {
  ending = true;
  clearTimeout(timeoutId);
  expiredAlert = null;
  setTimer(null);
  collapse();
  hidePill();
}

function scheduleTimeout(ms) {
  clearTimeout(timeoutId);
  if (ms > 0) {
    timeoutId = setTimeout(() => {
      done();
    }, ms);
  }
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
    const timeEl = root.querySelector('[data-time]');
    if (timeEl && sec !== lastSec) timeEl.textContent = clock(rem);
  }
  if (sec !== lastSec) {
    if (full && sec <= 3 && sec > 0 && lastSec !== -1) {
      punch(full.querySelector('[data-time]'), 1.07);
      buzz(25);
    }
    lastSec = sec;
  }
}

function playExpirationAlert() {
  unlockAudio();
  if (S().settings.sound) {
    // Doppia suoneria nitida e squillante per ambienti rumorosi come la palestra
    beep([[880, 0.12], [0, 0.05], [880, 0.12], [0, 0.05], [1320, 0.35]]);
    setTimeout(() => {
      if (S().settings.sound) beep([[880, 0.1], [0, 0.04], [1320, 0.4]]);
    }, 650);
  }
  buzz([200, 100, 200, 100, 500]);
}

function done() {
  if (ending) return;
  ending = true;
  clearTimeout(timeoutId);
  const t = S().timer;
  const scheda = t?.scheda || S().active?.scheda || '';
  const label = t?.label || '';
  setTimer(null);

  playExpirationAlert();

  const path = currentPath();
  const onWorkout = scheda && path === `/workout/${scheda}`;

  if (full) {
    const timeEl = full.querySelector('[data-time]');
    if (timeEl) timeEl.textContent = 'Via';
    full.classList.add('is-go');
    gsap.fromTo(timeEl, { scale: 0.55 }, { scale: 1, duration: 0.8, ease: 'back.out(3)' });
    gsap.fromTo(full.querySelector('.rest-flash'), { opacity: 0.55 }, { opacity: 0, duration: 1.2, ease: 'power2.out' });
    const prog = full.querySelector('.rr-prog');
    if (prog) gsap.set(prog, { drawSVG: '0% 100%' });
    setTimeout(() => {
      collapse();
      if (!onWorkout && scheda) {
        triggerExpiredAlert(scheda, label);
      }
    }, 1500);
  } else if (pill) {
    if (onWorkout) {
      pill.classList.add('is-go');
      const timeEl = pill.querySelector('[data-time]');
      if (timeEl) timeEl.textContent = 'Via';
      punch(pill, 1.15);
      setTimeout(() => {
        if (!S().timer && !expiredAlert) hidePill();
      }, 4000);
    } else {
      triggerExpiredAlert(scheda, label);
    }
  } else if (!onWorkout && scheda) {
    triggerExpiredAlert(scheda, label);
  }
}

function triggerExpiredAlert(scheda, label) {
  expiredAlert = { scheda, label };
  showPill();
  toast('Recupero terminato! Tocca per continuare.', {
    action: 'Vai al workout',
    onAction: () => {
      expiredAlert = null;
      hidePill();
      go(`#/workout/${scheda}`);
    },
    ms: 10000,
  });
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
  scheduleTimeout(rem * 1000);
  if (full) punch(full.querySelector('[data-time]'), delta > 0 ? 1.08 : 0.94);
}

export function adjustTimer(delta) {
  adjust(delta);
}

function expand(fresh = false) {
  const t = S().timer;
  if (!t) return;
  if (full) {
    full.dataset.s = t.scheda || '';
    const labelEl = full.querySelector('.rest-label');
    if (labelEl) labelEl.textContent = esc(t.label);
    const ofEl = full.querySelector('.rest-of');
    if (ofEl) ofEl.textContent = `su ${clock(t.dur)}`;
    full.classList.remove('is-go');
    full._intro = false;
    return;
  }
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
        <span class="mono"><i class="rec-dot"></i>Recupero ${t.scheda ? `· Scheda ${t.scheda}` : ''}</span>
        <button class="btn btn-ghost btn-sm min-pill-btn" data-act="min" aria-label="Riduci a pillola" data-press>
          <svg class="ico"><use href="#i-down"/></svg>
          <span>Riduci a pillola</span>
        </button>
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
  if (S().timer || expiredAlert) showPill();
}

function showPill() {
  const t = S().timer;
  const active = S().active;
  const path = currentPath();
  const targetScheda = expiredAlert?.scheda || t?.scheda || active?.scheda;
  const onWorkout = targetScheda && path === `/workout/${targetScheda}`;

  if (!t && !expiredAlert && (!active || active.type !== 'workout' || onWorkout)) {
    hidePill();
    return;
  }

  const root = document.getElementById('layers');
  if (!root) return;

  if (!pill) {
    pill = document.createElement('button');
    pill.className = 'rest-pill';
    root.appendChild(pill);
    gsap.fromTo(pill, { y: -60, scale: 0.6, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.6, ease: 'lift' });
  }

  pill.dataset.s = targetScheda || '';

  if (expiredAlert) {
    pill.className = 'rest-pill is-go is-alert';
    pill.setAttribute('aria-label', `Recupero terminato per Scheda ${expiredAlert.scheda}. Tocca per continuare`);
    pill.innerHTML = `
      <i class="rec-dot"></i>
      <span class="num">VIA!</span>
      <div class="pill-sub mono">
        <b>Recupero terminato</b>
        <small>Scheda ${expiredAlert.scheda}</small>
      </div>
      <span class="pill-cta mono">Vai al workout →</span>`;
    pill.onclick = () => {
      const s = expiredAlert.scheda;
      expiredAlert = null;
      hidePill();
      go(`#/workout/${s}`);
    };
    return;
  }

  if (t) {
    const rem = Math.max(0, (t.endAt - Date.now()) / 1000);
    pill.className = 'rest-pill';
    pill.setAttribute('aria-label', 'Apri il recupero');
    pill.innerHTML = `
      <svg viewBox="0 0 240 240" aria-hidden="true">
        <circle class="rr-track" cx="120" cy="120" r="${R}"/>
        <circle class="rr-prog" cx="120" cy="120" r="${R}" transform="rotate(-90 120 120)"/>
      </svg>
      <span class="num" data-time>${clock(rem)}</span>
      <div class="pill-sub mono">
        <span>recupero</span>
        ${t.scheda ? `<small>Scheda ${t.scheda}</small>` : ''}
      </div>
      ${!onWorkout && t.scheda ? `<span class="pill-cta mono">Torna →</span>` : ''}`;
    pill.onclick = () => {
      if (!onWorkout && t.scheda) {
        go(`#/workout/${t.scheda}`);
      } else {
        expand();
      }
    };
    lastSec = -1;
    document.documentElement.classList.add('has-pill');
    return;
  }

  if (active && active.type === 'workout' && !onWorkout) {
    pill.className = 'rest-pill is-session';
    pill.setAttribute('aria-label', `Sessione in corso per Scheda ${active.scheda}`);
    pill.innerHTML = `
      <i class="rec-dot"></i>
      <div class="pill-sub mono">
        <b>Scheda ${active.scheda}</b>
        <small>Sessione in corso</small>
      </div>
      <span class="pill-cta mono">Riprendi →</span>`;
    pill.onclick = () => {
      go(`#/workout/${active.scheda}`);
    };
    document.documentElement.classList.add('has-pill');
  }
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

export function syncTimerPill() {
  const t = S().timer;
  const active = S().active;
  const path = currentPath();
  const targetScheda = expiredAlert?.scheda || t?.scheda || active?.scheda;
  const onWorkout = targetScheda && path === `/workout/${targetScheda}`;

  if (full) {
    if (!onWorkout && path !== `/test/${t?.scheda}` && path !== `/max/${t?.scheda}` && path !== `/rm/${t?.scheda}`) {
      collapse(true);
    }
  }

  if (expiredAlert) {
    if (onWorkout) {
      expiredAlert = null;
      hidePill();
    } else {
      showPill();
    }
    return;
  }

  if (t) {
    if (!full) showPill();
  } else if (active && active.type === 'workout' && !onWorkout) {
    showPill();
  } else if (!full && pill) {
    hidePill();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    unlockAudio();
    syncTimerPill();
    const t = S().timer;
    if (t) {
      if (t.endAt <= Date.now()) done();
      else loop();
    }
  }
});

import {
  gsap, swap, intro, timing, SplitText, setMotion,
} from './anim.js';
import * as A from './anim.js';
import { S, subscribe } from './store.js';
import { initNav, go, back, currentPath } from './nav.js';
import { unlockAudio, keepAwake, setVibrate } from './util.js';
import { resumeTimer } from './ui/timer.js';
import { toast } from './ui/sheet.js';

import onboarding from './views/onboarding.js';
import home from './views/home.js';
import maxes from './views/maxes.js';
import diary from './views/diary.js';
import settings from './views/settings.js';
import testList from './views/test.js';
import rmFind from './views/rm.js';
import maxTest from './views/max.js';
import workout from './views/workout.js';
import summary from './views/summary.js';
import unlock from './views/unlock.js';

const ROUTES = [
  { re: /^\/benvenuto$/, view: onboarding, depth: 0 },
  { re: /^\/$/, view: home, depth: 0, tab: 'oggi' },
  { re: /^\/massimali$/, view: maxes, depth: 0, tab: 'massimali' },
  { re: /^\/diario$/, view: diary, depth: 0, tab: 'diario' },
  { re: /^\/impostazioni$/, view: settings, depth: 1 },
  { re: /^\/test\/([ABCD])$/, view: testList, depth: 1 },
  { re: /^\/workout\/([ABCD])$/, view: workout, depth: 1 },
  { re: /^\/fase1$/, view: unlock, depth: 2 },
  { re: /^\/rm\/([A-D]-[a-z0-9-]+)$/, view: rmFind, depth: 2 },
  { re: /^\/max\/([A-D]-[a-z0-9-]+)$/, view: maxTest, depth: 2 },
  { re: /^\/riepilogo\/([a-z0-9]+)$/, view: summary, depth: 3 },
];
const TABS = ['oggi', 'massimali', 'diario'];

const stage = document.getElementById('stage');
const tabbar = document.getElementById('tabbar');
let cur = null;
let tl = null;
let booting = true;

function resolve(path) {
  for (const r of ROUTES) {
    const m = path.match(r.re);
    if (m) return { r, params: m.slice(1) };
  }
  return null;
}

function route(force = false) {
  let path = currentPath();
  if (!S().onboarded && path !== '/benvenuto') path = '/benvenuto';
  if (S().onboarded && path === '/benvenuto') path = '/';
  let hit = resolve(path);
  if (!hit) {
    path = '/';
    hit = resolve(path);
  }
  if (`#${path}` !== location.hash) history.replaceState(history.state, '', `#${path}`);
  if (!force && cur?.path === path) return;

  const { r, params } = hit;
  const html = r.view.render(...params);
  if (html == null) {
    history.replaceState(history.state, '', '#/');
    route();
    return;
  }

  tl?.progress(1);
  const old = cur;
  const el = document.createElement('section');
  el.className = 'view';
  if (r.tab) el.classList.add('with-tabs');
  el.innerHTML = html;
  stage.appendChild(el);

  let dir = 0;
  if (old && !force) {
    if (r.depth !== old.r.depth) dir = r.depth > old.r.depth ? 1 : -1;
  }
  timing.delay = booting && document.getElementById('boot') ? 0.95 : dir > 0 ? 0.2 : dir < 0 ? 0.12 : 0.14;

  const cleanup = r.view.mount?.(el, ...params) || null;
  cur = { r, el, cleanup, path };
  setTabs(r.tab);

  tl = swap(old?.el, el, dir);
  tl.add(() => {
    if (old) {
      old.cleanup?.();
      old.el.remove();
    }
    gsap.set(el, { clearProps: 'transform,opacity,clipPath,zIndex' });
  });
  (r.view.intro || intro)(el, timing.delay);
  booting = false;
}

// ---------- Tabbar ----------
let tabsOn = false;
function setTabs(tab) {
  const links = [...tabbar.querySelectorAll('a')];
  links.forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  const ind = tabbar.querySelector('.tab-ind');
  const target = links.find((a) => a.dataset.tab === tab);
  if (tab && !tabsOn) {
    tabsOn = true;
    tabbar.hidden = false;
    gsap.killTweensOf(tabbar);
    gsap.fromTo(tabbar, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'out', delay: 0.1 });
    gsap.set(ind, { x: target.offsetLeft + target.offsetWidth / 2 - 17 });
  } else if (!tab && tabsOn) {
    tabsOn = false;
    gsap.killTweensOf(tabbar);
    gsap.to(tabbar, { yPercent: 110, duration: 0.4, ease: 'power2.in', onComplete: () => { tabbar.hidden = true; } });
  } else if (tab) {
    gsap.to(ind, { x: target.offsetLeft + target.offsetWidth / 2 - 17, duration: 0.55, ease: 'lift' });
    gsap.fromTo(ind, { scaleX: 1 }, { keyframes: { scaleX: [1.9, 1] }, duration: 0.55, ease: 'power2.out' });
  }
}
tabbar.querySelectorAll('a').forEach((a) => { a.dataset.replace = ''; });
window.addEventListener('resize', () => {
  const target = tabbar.querySelector('a.on');
  if (target) gsap.set(tabbar.querySelector('.tab-ind'), { x: target.offsetLeft + target.offsetWidth / 2 - 17 });
});

// ---------- Delegazione globale ----------
document.addEventListener('click', (e) => {
  const backBtn = e.target.closest('[data-back]');
  if (backBtn) {
    e.preventDefault();
    back(backBtn.dataset.back || '#/');
    return;
  }
  const a = e.target.closest('a[href^="#/"]');
  if (!a || e.defaultPrevented) return;
  e.preventDefault();
  const href = a.getAttribute('href');
  if (href === location.hash) return;
  go(href, { replace: a.dataset.replace != null });
});

// Feedback tattile visivo: tutto ciò che si preme "cede" un poco e torna con elasticità.
const PRESSABLE = '[data-press], .btn:not(.hold), .row, .mrow, .rung, .pdot, .icon-btn, .tile, .map-row, .entry-head, .seg button, .opts button, .stepper button, .wp-step, .xc-head';
document.addEventListener('pointerdown', (e) => {
  unlockAudio();
  if (A.reduced) return;
  const b = e.target.closest(PRESSABLE);
  if (!b) return;
  const s = b.offsetWidth > 220 ? 0.985 : 0.93;
  gsap.to(b, { scale: s, duration: 0.14, ease: 'power2.out', overwrite: 'auto' });
  const up = () => {
    gsap.to(b, { scale: 1, duration: 0.65, ease: 'elastic.out(1, 0.42)', overwrite: 'auto' });
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}, { passive: true });

// ---------- Stato → effetti di sistema ----------
const syncSystem = (s) => {
  setMotion(s.settings.motion);
  setVibrate(s.settings.vibrate);
  keepAwake(!!s.active && s.settings.wake);
};
subscribe(syncSystem);
syncSystem(S());

// ---------- Avvio ----------
function bootAnim() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  if (A.reduced || location.search.includes('noboot')) {
    boot.remove();
    return;
  }
  const bars = boot.querySelectorAll('.boot-mark i');
  const word = SplitText.create(boot.querySelector('.boot-word'), { type: 'chars', mask: 'chars' });
  gsap.timeline({ onComplete: () => boot.remove() })
    .from(bars, { yPercent: -140, opacity: 0, duration: 0.7, ease: 'drop', stagger: 0.07 }, 0)
    .from(bars, { scaleY: 1.2, scaleX: 0.8, duration: 0.7, ease: 'drop-squash', transformOrigin: '50% 100%', stagger: 0.07 }, 0)
    .from(word.chars, { yPercent: 110, duration: 0.6, ease: 'out', stagger: 0.04 }, 0.25)
    .to(boot, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.7, ease: 'io' }, 0.95);
  gsap.set(boot, { clipPath: 'inset(0% 0% 0% 0%)' });
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  const dev = ['localhost', '127.0.0.1'].includes(location.hostname) && !location.search.includes('sw');
  if (dev) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Cerca una nuova versione a ogni apertura dell'app e ogni volta che torna in primo piano.
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state !== 'installed' || !navigator.serviceWorker.controller) return;
        // Con una sessione aperta non si ricarica da soli: decide l'utente.
        if (S().active) {
          toast('Nuova versione di GHISA pronta', { action: 'Aggiorna', ms: 15000, onAction: () => nw.postMessage('skip') });
        } else {
          nw.postMessage('skip');
        }
      });
    });
  }).catch(() => {});
  // Ricarica solo quando una nuova versione sostituisce quella attiva, non alla prima installazione.
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return;
    reloading = true;
    try { sessionStorage.setItem('ghisa:updated', '1'); } catch { /* storage non disponibile */ }
    location.reload();
  });
  try {
    if (sessionStorage.getItem('ghisa:updated')) {
      sessionStorage.removeItem('ghisa:updated');
      setTimeout(() => toast('GHISA aggiornata: nuova versione attiva'), 1800);
    }
  } catch { /* storage non disponibile */ }
}

async function boot() {
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
  initNav(route);
  bootAnim();
  route();
  resumeTimer();
  registerSW();
}

boot();

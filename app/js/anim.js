// Motore di animazione: plugin GSAP, curve proprietarie e micro-interazioni condivise.
const {
  gsap, CustomEase, CustomBounce, Draggable, InertiaPlugin, DrawSVGPlugin, Flip, Observer,
  Physics2DPlugin, ScrambleTextPlugin, SplitText,
} = window;

gsap.registerPlugin(
  CustomEase, CustomBounce, Draggable, InertiaPlugin, DrawSVGPlugin, Flip, Observer,
  Physics2DPlugin, ScrambleTextPlugin, SplitText,
);

export { gsap, Draggable, Flip, Observer, SplitText, InertiaPlugin };

// "auto" segue il sistema (prefers-reduced-motion); dalle impostazioni si può forzare.
const mq = matchMedia('(prefers-reduced-motion: reduce)');
let motionMode = 'auto';
export let reduced = mq.matches;
export function setMotion(mode = 'auto') {
  motionMode = mode;
  reduced = mode === 'reduced' || (mode === 'auto' && mq.matches);
  document.documentElement.classList.toggle('calm', reduced);
}
mq.addEventListener?.('change', () => setMotion(motionMode));
export const systemPrefersReduced = () => mq.matches;

// Curve della casa: "out" lunga e morbida, "io" decisa per i cambi pagina,
// "lift" con un filo di overshoot (il peso che arriva in cima e si assesta).
CustomEase.create('out', '0.16,1,0.3,1');
CustomEase.create('io', '0.77,0,0.18,1');
CustomEase.create('lift', 'M0,0 C0.25,0 0.18,1.12 0.55,1.04 0.74,1 0.86,1 1,1');
CustomBounce.create('drop', { strength: 0.32, squash: 1.6, squashID: 'drop-squash' });
gsap.defaults({ ease: 'out', duration: 0.6 });
// Per anteprime con fotogrammi rallentati (es. pannelli in background): tempo reale, niente lag smoothing.
if (new URLSearchParams(location.search).has('nolag')) gsap.ticker.lagSmoothing(0);

export const COLORS = { A: '#ee3b2f', B: '#3d74ff', C: '#f7c51b', D: '#22b85e' };

/** Ritardo d'entrata della vista corrente (impostato dal router, letto dalle viste). */
export const timing = { delay: 0 };

/** Luce ambientale dal basso, nel colore della scheda attiva. */
export function setGlow(letter, opacity = 0.2) {
  const g = document.getElementById('glow');
  if (!g) return;
  gsap.to(g, { '--glow': COLORS[letter] || '#3d74ff', opacity, duration: 1.1, ease: 'power2.out', overwrite: 'auto' });
}

const fmtInt = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0 });
const fmtKg = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

export function countUp(el, to, { dur = 1.4 } = {}) {
  const o = { v: 0 };
  el.textContent = '0';
  return gsap.to(o, {
    v: to,
    duration: reduced ? 0.01 : dur,
    ease: 'power3.out',
    onUpdate: () => { el.textContent = fmtInt.format(o.v); },
    onComplete: () => { el.textContent = fmtKg.format(to); },
  });
}

/** Entrata coreografata di una vista: titoli a maschera, blocchi in salita, barre, contatori. */
export function intro(root, delay = 0) {
  const tl = gsap.timeline({ delay });
  const rise = root.querySelectorAll('[data-a="rise"]');
  if (reduced) {
    tl.fromTo(root.querySelectorAll('[data-a], [data-split]'), { opacity: 0 }, { opacity: 1, duration: 0.2, clearProps: 'opacity' });
    root.querySelectorAll('[data-count]').forEach((el) => { el.textContent = fmtKg.format(+el.dataset.count); });
    return tl;
  }
  root.querySelectorAll('[data-split]').forEach((el, i) => {
    const chars = el.dataset.split === 'chars';
    const sp = SplitText.create(el, {
      type: chars ? 'lines,chars' : 'lines',
      mask: 'lines',
      linesClass: 'ln',
    });
    tl.from(chars ? sp.chars : sp.lines, {
      yPercent: 118,
      rotate: chars ? 7 : 0,
      duration: 1,
      stagger: chars ? 0.028 : 0.085,
      ease: 'out',
    }, 0.04 + i * 0.07);
  });
  if (rise.length) {
    tl.fromTo(rise, { y: 28, opacity: 0 }, {
      y: 0,
      opacity: 1,
      duration: 0.8,
      stagger: (i) => Math.min(i * 0.045, 0.55),
      clearProps: 'transform,opacity',
    }, 0.06);
  }
  const pop = root.querySelectorAll('[data-a="pop"]');
  if (pop.length) {
    tl.fromTo(pop, { scale: 0.5, opacity: 0 }, {
      scale: 1, opacity: 1, duration: 0.8, ease: 'back.out(2.2)', stagger: 0.05, clearProps: 'transform,opacity',
    }, 0.15);
  }
  const bars = root.querySelectorAll('[data-a="bar"]');
  if (bars.length) {
    tl.from(bars, {
      scaleX: 0, transformOrigin: '0% 50%', duration: 1.2, ease: 'io', stagger: 0.06,
    }, 0.2);
  }
  root.querySelectorAll('[data-count]').forEach((el) => {
    tl.add(countUp(el, +el.dataset.count), 0.25);
  });
  return tl;
}

/** Cambio pagina: push = la nuova entra a tendina da destra, pop = l'inverso, tab = dissolvenza. */
export function swap(oldEl, newEl, dir) {
  const tl = gsap.timeline({ defaults: { duration: 0.66, ease: 'io' } });
  if (!oldEl) return tl;
  if (reduced) {
    tl.to(oldEl, { opacity: 0, duration: 0.12 }).from(newEl, { opacity: 0, duration: 0.2 });
    return tl;
  }
  const hidden = 'inset(0% 0% 0% 100%)';
  const shown = 'inset(0% 0% 0% 0%)';
  if (dir > 0) {
    gsap.set(newEl, { zIndex: 3 });
    tl.fromTo(newEl, { clipPath: hidden, x: 70 }, { clipPath: shown, x: 0 }, 0)
      .to(oldEl, { x: -60, opacity: 0.25, scale: 0.96 }, 0);
  } else if (dir < 0) {
    gsap.set(oldEl, { zIndex: 3 });
    tl.to(oldEl, { clipPath: hidden, x: 70 }, 0)
      .fromTo(newEl, { x: -60, opacity: 0.25, scale: 0.96 }, { x: 0, opacity: 1, scale: 1 }, 0);
  } else {
    tl.to(oldEl, { opacity: 0, y: 12, duration: 0.24, ease: 'power2.in' }, 0)
      .fromTo(newEl, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'out' }, 0.14);
  }
  return tl;
}

/** Nuvola di magnesite: polvere bianca con qualche granello nel colore della scheda. */
export function chalk(x, y, { color = '#eeebe3', n = 30, power = 1 } = {}) {
  if (reduced) return;
  const layer = document.getElementById('fx');
  if (!layer) return;
  const puff = document.createElement('i');
  puff.className = 'puff';
  puff.style.left = `${x}px`;
  puff.style.top = `${y}px`;
  layer.appendChild(puff);
  gsap.fromTo(puff, { scale: 0.2, opacity: 0.55 }, {
    scale: 2.6 * power, opacity: 0, duration: 1.3, ease: 'power2.out', onComplete: () => puff.remove(),
  });
  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    const size = gsap.utils.random(2.5, 8);
    d.className = 'dust';
    d.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${i % 5 === 0 ? color : '#eeebe3'}`;
    layer.appendChild(d);
    gsap.to(d, {
      duration: gsap.utils.random(0.8, 1.6),
      physics2D: {
        velocity: gsap.utils.random(160, 520) * power,
        angle: gsap.utils.random(195, 345),
        gravity: 820,
      },
      opacity: 0,
      scale: gsap.utils.random(0.3, 1.5),
      ease: 'none',
      onComplete: () => d.remove(),
    });
  }
}

export function chalkAt(el, opts) {
  const r = el.getBoundingClientRect();
  chalk(r.left + r.width / 2, r.top + r.height / 2, opts);
}

export function scramble(el, text, duration = 0.8) {
  if (reduced) {
    el.textContent = text;
    return gsap.timeline();
  }
  return gsap.to(el, { duration, scrambleText: { text, chars: '0123456789', speed: 0.7 }, ease: 'none' });
}

export const shake = (el, amp = 8) => gsap.fromTo(el, { x: 0 }, {
  keyframes: { x: [-amp, amp * 0.85, -amp * 0.6, amp * 0.35, 0] },
  duration: 0.42,
  ease: 'none',
});

export const punch = (el, s = 1.12) => gsap.fromTo(el, { scale: 1 }, {
  keyframes: { scale: [s, 0.97, 1] },
  duration: 0.55,
  ease: 'power2.out',
});

/** Il numero "scorre" verso l'alto e viene sostituito: ideale per pesi che cambiano. */
export function flipText(el, text) {
  if (el.textContent === text) return;
  if (reduced) {
    el.textContent = text;
    return;
  }
  gsap.timeline()
    .to(el, { yPercent: -40, opacity: 0, duration: 0.14, ease: 'power2.in' })
    .add(() => { el.textContent = text; })
    .fromTo(el, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.4, ease: 'out' });
}

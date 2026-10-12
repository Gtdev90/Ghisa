import { gsap } from '../anim.js';
import { buzz } from '../util.js';

/** Bottone "tieni premuto": la zigrinatura riempie il bottone, al rilascio torna indietro. */
export function holdButton(btn, { duration = 1.1, onDone }) {
  const fill = btn.querySelector('.hold-fill');
  let tw = null;
  let fired = false;

  const start = (e) => {
    if (e.button > 0 || fired) return;
    tw?.kill();
    buzz(8);
    const from = gsap.getProperty(fill, 'scaleX');
    gsap.to(btn, { scale: 0.975, duration: 0.25, ease: 'power2.out' });
    tw = gsap.to(fill, {
      scaleX: 1,
      duration: duration * (1 - from),
      ease: 'none',
      onComplete: () => {
        fired = true;
        buzz([30, 40, 60]);
        gsap.to(btn, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        onDone();
      },
    });
  };
  const stop = () => {
    if (!tw || fired) return;
    tw.kill();
    tw = null;
    gsap.to(fill, { scaleX: 0, duration: 0.4, ease: 'power2.out' });
    gsap.to(btn, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
  };

  btn.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => btn.addEventListener(ev, stop));
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!fired) {
        fired = true;
        onDone();
      }
    }
  });
  return { reset: () => { fired = false; gsap.set(fill, { scaleX: 0 }); } };
}

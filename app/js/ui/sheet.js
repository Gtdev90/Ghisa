import { gsap, Draggable } from '../anim.js';
import { pushLayer } from '../nav.js';
import { esc } from '../util.js';

/** Pannello dal basso, trascinabile per chiuderlo. */
export function sheet({ html, accent, cls = '', onMount, onClose }) {
  const root = document.getElementById('layers');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  if (accent) wrap.dataset.s = accent;
  wrap.innerHTML = `<div class="scrim"></div>
    <section class="sheet ${cls}" role="dialog" aria-modal="true">
      <div class="grip" aria-hidden="true"><i></i></div>
      <div class="sheet-in">${html}</div>
    </section>`;
  root.appendChild(wrap);

  const panel = wrap.querySelector('.sheet');
  const scrim = wrap.querySelector('.scrim');
  let closed = false;

  gsap.timeline()
    .fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
    .fromTo(panel, { yPercent: 104 }, { yPercent: 0, duration: 0.62, ease: 'out' }, 0)
    .from(panel.querySelectorAll('.sheet-in > *'), {
      y: 22, opacity: 0, stagger: 0.04, duration: 0.55, clearProps: 'transform,opacity',
    }, 0.1);

  let lastY = 0;
  let lastT = 0;
  let vel = 0;
  const [drag] = Draggable.create(panel, {
    type: 'y',
    trigger: [wrap.querySelector('.grip'), ...wrap.querySelectorAll('.sheet-head')],
    bounds: { minY: 0, maxY: 2000 },
    edgeResistance: 1,
    onPress() {
      lastY = 0;
      lastT = performance.now();
      vel = 0;
    },
    onDrag() {
      const t = performance.now();
      vel = (this.y - lastY) / Math.max(0.001, (t - lastT) / 1000);
      lastY = this.y;
      lastT = t;
    },
    onRelease() {
      if (this.y > panel.offsetHeight * 0.26 || vel > 900) close();
      else gsap.to(panel, { y: 0, duration: 0.45, ease: 'back.out(2)' });
    },
  });

  function out() {
    closed = true;
    drag.kill();
    gsap.to(scrim, { opacity: 0, duration: 0.3 });
    gsap.to(panel, {
      yPercent: 104, duration: 0.42, ease: 'power3.in', onComplete: () => wrap.remove(),
    });
    onClose?.();
  }

  const release = pushLayer(() => { if (!closed) out(); });

  function close() {
    if (closed) return;
    out();
    release();
  }

  scrim.addEventListener('click', close);
  onMount?.(panel, close);
  return { el: panel, close };
}

export function confirm({ title, text = '', ok = 'Conferma', cancel = 'Annulla', danger = false, accent }) {
  return new Promise((resolve) => {
    let result = false;
    const s = sheet({
      accent,
      cls: 'sheet-confirm',
      html: `<div class="sheet-head"><h2 class="sheet-title">${esc(title)}</h2></div>
        ${text ? `<p class="sheet-text">${text}</p>` : ''}
        <div class="btn-row">
          <button class="btn btn-ghost" data-r="0">${esc(cancel)}</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-chalk'}" data-r="1">${esc(ok)}</button>
        </div>`,
      onClose: () => resolve(result),
    });
    s.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      result = b.dataset.r === '1';
      s.close();
    });
  });
}

export function toast(msg, { action, onAction, ms = 2600 } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${msg}</span>${action ? `<button>${esc(action)}</button>` : ''}`;
  document.getElementById('layers').appendChild(el);
  gsap.fromTo(el, { y: -40, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'lift' });
  const hide = () => gsap.to(el, { y: -30, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => el.remove() });
  const t = setTimeout(hide, ms);
  el.querySelector('button')?.addEventListener('click', () => {
    clearTimeout(t);
    onAction?.();
    hide();
  });
}

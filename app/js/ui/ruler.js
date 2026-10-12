import { gsap, Draggable } from '../anim.js';
import { clamp, buzz } from '../util.js';

/**
 * Selettore di carico a "metro": si trascina e si lancia con inerzia,
 * scatta ogni mezzo kg e vibra a ogni 2,5 kg.
 */
export function ruler(host, { value = 0, min = 0, max = 300, res = 0.5, px = 9, onChange, onSettle } = {}) {
  const steps = Math.round((max - min) / res);
  const W = steps * px;
  let labels = '';
  for (let v = Math.ceil(min / 5) * 5; v <= max; v += 5) {
    labels += `<span style="left:${((v - min) / res) * px}px">${v}</span>`;
  }
  host.classList.add('ruler');
  host.style.setProperty('--px', `${px}px`);
  host.innerHTML = `<div class="ruler-track" style="width:${W}px">${labels}</div><div class="ruler-needle"></div>`;
  const track = host.firstElementChild;

  let center = host.clientWidth / 2;
  const toX = (v) => center - ((v - min) / res) * px;
  const toV = (x) => clamp(+(min + Math.round((center - x) / px) * res).toFixed(2), min, max);
  let cur = clamp(value, min, max);
  gsap.set(track, { x: toX(cur) });

  const read = (x) => {
    const v = toV(x);
    if (v === cur) return;
    cur = v;
    if (Math.abs(v / 2.5 - Math.round(v / 2.5)) < 1e-6) buzz(6);
    onChange?.(v);
  };

  const [drag] = Draggable.create(track, {
    type: 'x',
    inertia: true,
    edgeResistance: 0.9,
    bounds: { minX: center - W, maxX: center },
    snap: (x) => center - Math.round((center - x) / px) * px,
    onDrag() { read(this.x); },
    onThrowUpdate() { read(this.x); },
    onThrowComplete() { onSettle?.(cur); },
    onRelease() { if (!this.tween) onSettle?.(cur); },
  });

  const onResize = () => {
    center = host.clientWidth / 2;
    drag.applyBounds({ minX: center - W, maxX: center });
    gsap.set(track, { x: toX(cur) });
    drag.update();
  };
  window.addEventListener('resize', onResize);

  return {
    get: () => cur,
    set(v, animate = true) {
      cur = clamp(+(+v).toFixed(2), min, max);
      onChange?.(cur);
      gsap.to(track, {
        x: toX(cur),
        duration: animate ? 0.7 : 0,
        ease: 'out',
        onComplete: () => {
          drag.update();
          onSettle?.(cur);
        },
      });
    },
    kill() {
      drag.kill();
      window.removeEventListener('resize', onResize);
    },
  };
}

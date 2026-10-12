// Attrezzatura disegnata: bilanciere con dischi IWF, disco frontale, selettore di carico.
import { gsap, flipText } from '../anim.js';
import { KIND } from '../data.js';
import { plates, kg, clamp, esc } from '../util.js';
import { ruler } from './ruler.js';

// [altezza, spessore, colore] — dischi bumper tutti alti uguali, dischetti più piccoli.
const SPEC = {
  25: [86, 13, 'var(--red)'],
  20: [86, 11, 'var(--blue)'],
  15: [86, 9.5, 'var(--yellow)'],
  10: [86, 8, 'var(--green)'],
  5: [58, 7, '#e9e6de'],
  2.5: [44, 6, 'var(--red)'],
  1.25: [34, 5, '#a8a59d'],
};

export function barbellSVG(total, bar) {
  const { side, rest } = plates(total, bar);
  const H = 100;
  const cy = 50;
  const gap = 1.5;
  const stack = side.reduce((a, p) => a + SPEC[p][1] + gap, 0);
  const sleeve = Math.max(64, stack + 10);
  const shaft = 116;
  const W = 2 * (sleeve + 8) + shaft;
  let s = `<svg class="bb-svg" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    <rect class="bb-sleeve" x="0" y="${cy - 5}" width="${sleeve}" height="10" rx="2"/>
    <rect class="bb-sleeve" x="${W - sleeve}" y="${cy - 5}" width="${sleeve}" height="10" rx="2"/>
    <rect class="bb-collar" x="${sleeve}" y="${cy - 11}" width="8" height="22" rx="2"/>
    <rect class="bb-collar" x="${W - sleeve - 8}" y="${cy - 11}" width="8" height="22" rx="2"/>
    <rect class="bb-shaft" x="${sleeve + 8}" y="${cy - 3.5}" width="${shaft}" height="7"/>
    <rect class="bb-knurl" x="${sleeve + 8 + 14}" y="${cy - 3.5}" width="${shaft - 28}" height="7"/>`;
  let xr = W - sleeve + 1;
  let xl = sleeve - 1;
  side.forEach((p, i) => {
    const [h, w, c] = SPEC[p];
    s += `<rect class="bb-plate" data-side="r" style="--i:${i}" x="${xr}" y="${cy - h / 2}" width="${w}" height="${h}" rx="1.6" fill="${c}"/>`;
    xr += w + gap;
    xl -= w;
    s += `<rect class="bb-plate" data-side="l" style="--i:${i}" x="${xl}" y="${cy - h / 2}" width="${w}" height="${h}" rx="1.6" fill="${c}"/>`;
    xl -= gap;
  });
  s += '</svg>';
  let label = '';
  if (total < bar) label = `sotto il peso del bilanciere (${kg(bar)} kg)`;
  else if (!side.length) label = 'solo bilanciere';
  else label = `per lato <b>${side.map(kg).join(' + ')}</b>${rest > 0 ? ` <em>+${kg(rest)} da compensare</em>` : ''}`;
  return { svg: s, label, key: `${side.join(',')}|${rest}|${total < bar}` };
}

/** Monta il bilanciere in `el`; ritorna una funzione che lo aggiorna animando i dischi. */
export function barbell(el, getBar) {
  let key = null;
  return (total, animate = true) => {
    const r = barbellSVG(total, getBar());
    if (r.key === key) return;
    key = r.key;
    el.innerHTML = `${r.svg}<div class="bb-label mono">${r.label}</div>`;
    if (!animate) return;
    const right = el.querySelectorAll('.bb-plate[data-side="r"]');
    const left = el.querySelectorAll('.bb-plate[data-side="l"]');
    gsap.from(right, { x: 26, opacity: 0, duration: 0.55, stagger: 0.035, ease: 'back.out(2.4)' });
    gsap.from(left, { x: -26, opacity: 0, duration: 0.55, stagger: 0.035, ease: 'back.out(2.4)' });
  };
}

let plateId = 0;
/** Disco bumper visto di fronte, con scritta sul bordo. */
export function plateSVG(rim = '') {
  const id = `rim${++plateId}`;
  // La scritta deve fare il giro completo del bordo: si ripete e si "stira" sulla circonferenza.
  const text = rim.length < 40 ? rim.repeat(2) : rim;
  return `<svg class="plate" viewBox="0 0 200 200" aria-hidden="true">
    <defs><path id="${id}" d="M100,100 m-79,0 a79,79 0 1,1 158,0 a79,79 0 1,1 -158,0"/></defs>
    <circle class="pl-body" cx="100" cy="100" r="98"/>
    <circle class="pl-line" cx="100" cy="100" r="89"/>
    <text class="pl-rim"><textPath href="#${id}" textLength="494" lengthAdjust="spacing">${esc(text)}</textPath></text>
    <circle class="pl-line" cx="100" cy="100" r="70"/>
    <circle class="pl-groove" cx="100" cy="100" r="46"/>
    <circle class="pl-hub" cx="100" cy="100" r="25"/>
    <circle class="pl-hole" cx="100" cy="100" r="12.5"/>
  </svg>`;
}

/**
 * Selettore di carico completo: numero gigante, − / +, metro trascinabile,
 * bilanciere animato (se l'esercizio lo prevede), digitazione diretta al tocco.
 */
export function weightPicker(host, { kind = 'machine', value, bar = 20, onChange, showBar = kind === 'barbell' }) {
  const K = KIND[kind];
  const min = 0;
  const max = K.max;
  host.classList.add('wp');
  host.innerHTML = `
    <div class="wp-top">
      <button class="wp-step" data-d="-1" aria-label="Meno ${kg(K.step)} kg" data-press><svg class="ico"><use href="#i-minus"/></svg><span class="mono">${kg(K.step)}</span></button>
      <div class="wp-val" role="button" tabindex="0" aria-label="Scrivi il carico">
        <b class="num" data-v>${kg(value)}</b><span class="wp-unit">kg</span>
      </div>
      <button class="wp-step" data-d="1" aria-label="Più ${kg(K.step)} kg" data-press><svg class="ico"><use href="#i-plus"/></svg><span class="mono">${kg(K.step)}</span></button>
    </div>
    <div class="wp-hint mono" data-hint>${K.label}</div>
    ${showBar ? '<div class="bb" data-bb></div>' : ''}
    <div class="wp-ruler" data-ruler></div>`;

  const vEl = host.querySelector('[data-v]');
  const hint = host.querySelector('[data-hint]');
  const bb = showBar ? barbell(host.querySelector('[data-bb]'), () => bar) : null;
  let animateNext = false;

  const paintHint = (v) => {
    if (kind === 'body') hint.innerHTML = v === 0 ? '<b>Corpo libero</b>' : `Sovraccarico · ${kg(v)} kg`;
  };

  const r = ruler(host.querySelector('[data-ruler]'), {
    value, min, max,
    onChange(v) {
      if (animateNext) flipText(vEl, kg(v));
      else vEl.textContent = kg(v);
      animateNext = false;
      paintHint(v);
      onChange?.(v);
    },
    onSettle(v) { bb?.(v); },
  });
  bb?.(value, false);
  paintHint(value);

  host.addEventListener('click', (e) => {
    const step = e.target.closest('.wp-step');
    if (step) {
      animateNext = true;
      const cur = r.get();
      const d = +step.dataset.d * K.step;
      // Si allinea alla griglia dello step prima di sommare (es. 41 → 42,5 con step 2,5).
      const next = d > 0 ? Math.floor(cur / K.step + 1e-9) * K.step + K.step : Math.ceil(cur / K.step - 1e-9) * K.step - K.step;
      r.set(clamp(next, min, max));
      return;
    }
    if (e.target.closest('.wp-val')) typeIn();
  });

  function typeIn() {
    const box = host.querySelector('.wp-val');
    if (box.querySelector('input')) return;
    const input = document.createElement('input');
    input.type = 'number';
    input.inputMode = 'decimal';
    input.step = '0.25';
    input.min = String(min);
    input.max = String(max);
    input.value = String(r.get());
    input.className = 'wp-input num';
    input.setAttribute('aria-label', 'Carico in kg');
    box.appendChild(input);
    vEl.style.visibility = 'hidden';
    input.focus();
    input.select();
    const done = () => {
      const v = parseFloat(String(input.value).replace(',', '.'));
      input.remove();
      vEl.style.visibility = '';
      if (!Number.isNaN(v)) {
        animateNext = true;
        r.set(clamp(Math.round(v * 4) / 4, min, max));
      }
    };
    input.addEventListener('blur', done, { once: true });
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); });
  }

  return {
    get: r.get,
    set: (v) => { animateNext = true; r.set(v); },
    kill: r.kill,
  };
}

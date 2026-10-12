// Sblocco della Fase 1: il momento in cui il test diventa programma.
import {
  gsap, SplitText, setGlow, chalkAt, shake, countUp, reduced,
} from '../anim.js';
import { ALL, EX, SCHEDE } from '../data.js';
import { S, doneTotal, workLoad, rmOf, enterPhase1 } from '../store.js';
import { go } from '../nav.js';
import { plateSVG } from '../ui/gear.js';
import { $, $$, esc, kg, buzz } from '../util.js';

export default {
  render() {
    const done = doneTotal();
    const tot = ALL.length;
    const already = S().phase === 'fase1';
    const big = [EX['A-squat'], EX['C-stacco']].filter((e) => rmOf(e.id) != null);
    return `
      <div class="unlock">
        <span class="mono" data-u="kick">${done === tot ? 'Test completato' : 'Test parziale'} · ${done}/${tot} RM</span>
        <h1 class="mega" data-u="mega"><span class="w">Fase</span> <span class="one">1</span></h1>
        <div class="u-plates" data-u="plates">
          ${SCHEDE.map((s, i) => `<div class="plate-wrap" data-s="${s.id}" style="left:${i * 22}%">${plateSVG(`Scheda ${s.id} · Workout ${s.workout} · `)}</div>`).join('')}
        </div>
        <div class="u-rules">
          <div data-u="r"><span class="mono">Squat · Stacco</span><b class="num" data-pct="70">70</b><p>% del massimale</p></div>
          <div data-u="r"><span class="mono">Tutti gli altri</span><b class="num" data-pct="100">100</b><p>% dell'RM rilevato</p></div>
        </div>
        ${big.length ? `<p class="mono" data-u="r" style="margin-bottom:18px">${big.map((e) => `${esc(e.name)} ${e.sets}×${e.reps} @ <b style="color:var(--chalk)">${kg(workLoad(e))} kg</b>`).join(' · ')}</p>` : ''}
        <button class="btn btn-chalk btn-xl" data-act="go" data-u="btn">${already ? 'Vai agli allenamenti' : 'Inizia la Fase 1'}</button>
        ${done < tot && !already ? '<p class="mono" data-u="btn" style="margin-top:12px">Gli esercizi senza RM ti chiederanno il carico in allenamento.</p>' : ''}
        <button class="link-btn" data-back="#/" data-u="btn" style="margin-top:6px">Non ora</button>
      </div>`;
  },

  intro(el, delay) {
    const word = SplitText.create($('.w', el), { type: 'chars' });
    const one = $('.one', el);
    const plates = $$('.plate-wrap', el);
    const pcts = $$('[data-pct]', el);
    const q = gsap.utils.selector(el);
    const tl = gsap.timeline({ delay });
    if (reduced) return tl.from(q('[data-u]'), { opacity: 0, duration: 0.3 });
    pcts.forEach((p) => { p.textContent = '0'; });
    tl.from(q('[data-u="kick"]'), { y: 18, opacity: 0, duration: 0.6 }, 0)
      .from(word.chars, { yPercent: -180, opacity: 0, duration: 0.9, ease: 'drop', stagger: 0.07 }, 0.1)
      .from(word.chars, { scaleY: 1.25, scaleX: 0.85, duration: 0.9, ease: 'drop-squash', transformOrigin: '50% 100%', stagger: 0.07 }, 0.1)
      .from(one, { scale: 5, opacity: 0, filter: 'blur(18px)', duration: 0.5, ease: 'power4.in' }, 0.7)
      .add(() => {
        chalkAt(one, { color: '#ee3b2f', n: 56, power: 1.5 });
        shake($('#stage'), 9);
        buzz([40, 30, 90]);
      }, 1.2)
      .from(plates, {
        x: () => window.innerWidth, rotation: 720, duration: 1.5, ease: 'out', stagger: 0.1,
      }, 1.05)
      .from(q('[data-u="r"]'), { y: 30, opacity: 0, stagger: 0.1, duration: 0.7 }, 1.3)
      .add(() => pcts.forEach((p) => countUp(p, +p.dataset.pct, { dur: 1.2 })), 1.35)
      .from(q('[data-u="btn"]'), { y: 22, opacity: 0, duration: 0.6, stagger: 0.08 }, 1.6);
    return tl;
  },

  mount(el) {
    setGlow('A', 0.28);
    el.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act="go"]')) return;
      if (S().phase !== 'fase1') enterPhase1();
      go('#/', { replace: true });
    });
  },
};

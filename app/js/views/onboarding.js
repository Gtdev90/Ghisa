import { gsap, Observer, SplitText, setGlow, countUp, timing } from '../anim.js';
import { ALL, SCHEDE, PROTOCOL } from '../data.js';
import { setOnboarded } from '../store.js';
import { go } from '../nav.js';
import { plateSVG } from '../ui/gear.js';
import { $, $$ } from '../util.js';

const SLIDES = [
  {
    s: 'A',
    kicker: '01 · Benvenuto',
    title: 'Prima si misura.<br>Poi si carica.',
    text: `Quattro schede, ${ALL.length} esercizi, un test per ognuno. I carichi li calcola GHISA sui tuoi numeri: niente pesi a caso.`,
    art: () => `<div class="art-plates">${SCHEDE.map((s) => `<div class="plate-wrap" data-s="${s.id}">${plateSVG(`Scheda ${s.id} · Workout ${s.workout} · Ghisa · `)}</div>`).join('')}</div>`,
  },
  {
    s: 'B',
    kicker: '02 · Fase test',
    title: 'Trova il tuo RM.',
    text: 'Sali di peso finché chiudi le ripetizioni indicate: il carico più alto riuscito è il tuo RM. Squat e Stacco seguono un protocollo guidato in 9 step fino al massimale.',
    art: () => `<div class="art-ramp">${PROTOCOL.steps.map((st) => `<i style="height:${st.pct ?? 14}%"><span>${st.pct ? `${st.pct}%` : 'bil.'}</span></i>`).join('')}</div>`,
  },
  {
    s: 'C',
    kicker: '03 · Fase 1',
    title: 'Poi si lavora.',
    text: 'Rilevati tutti i pesi, si parte: serie, ripetizioni, carichi e recuperi sono già pronti per ogni allenamento.',
    art: () => `<div class="art-split">
        <div><span class="big"><b class="num" data-to="70">0</b><i>%</i></span><span class="mono">del massimale<br>Squat · Stacco</span></div>
        <div><span class="big"><b class="num" data-to="100">0</b><i>%</i></span><span class="mono">dell'RM rilevato<br>tutti gli altri</span></div>
      </div>`,
  },
];

export default {
  render() {
    return `
      <div class="onb-top">
        <div class="wordmark"><span class="marks"><i></i><i></i><i></i><i></i></span>GHISA</div>
        <button class="link-btn" data-act="skip">Salta</button>
      </div>
      <div class="onb-stage">
        ${SLIDES.map((sl, i) => `
          <section class="slide ${i === 0 ? 'on' : ''}" data-s="${sl.s}" aria-hidden="${i !== 0}">
            <div class="slide-art">${sl.art()}</div>
            <div class="slide-copy">
              <span class="mono">${sl.kicker}</span>
              <h1 class="h-xl">${sl.title}</h1>
              <p class="lede">${sl.text}</p>
            </div>
          </section>`).join('')}
      </div>
      <div class="onb-foot">
        <div class="onb-dots">${SLIDES.map(() => '<i><b></b></i>').join('')}</div>
        <button class="btn btn-chalk" data-act="next" data-press>Avanti</button>
      </div>`;
  },

  intro() {},

  mount(el) {
    el.classList.add('onb');
    const slides = $$('.slide', el);
    const dots = $$('.onb-dots b', el);
    const nextBtn = $('[data-act="next"]', el);
    const splits = slides.map((s) => SplitText.create($('.h-xl', s), { type: 'lines', mask: 'lines' }));
    let idx = 0;
    let busy = false;

    const artIn = (i) => {
      const s = slides[i];
      const tl = gsap.timeline();
      if (i === 0) {
        const plates = $$('.plate-wrap', s);
        plates.forEach((p, k) => gsap.set(p, { left: `${k * 18}%`, yPercent: -50, y: (k - 1.5) * 14 }));
        tl.from(plates, {
          x: () => window.innerWidth,
          rotation: 600,
          duration: 1.5,
          ease: 'out',
          stagger: 0.12,
        });
      } else if (i === 1) {
        tl.from($$('.art-ramp i', s), { scaleY: 0, duration: 0.9, ease: 'io', stagger: 0.06 })
          .from($$('.art-ramp span', s), { opacity: 0, y: 8, stagger: 0.05, duration: 0.4 }, 0.4);
      } else {
        $$('[data-to]', s).forEach((n, k) => tl.add(countUp(n, +n.dataset.to, { dur: 1.3 }), k * 0.15));
        tl.from($$('.art-split > div', s), { x: 40, opacity: 0, stagger: 0.12, duration: 0.8 }, 0);
      }
      return tl;
    };

    const copyIn = (i) => {
      const s = slides[i];
      return gsap.timeline()
        .from($('.slide-copy .mono', s), { y: 16, opacity: 0, duration: 0.6 }, 0)
        .from(splits[i].lines, { yPercent: 115, duration: 0.95, ease: 'out', stagger: 0.09 }, 0.05)
        .from($('.lede', s), { y: 20, opacity: 0, duration: 0.8 }, 0.25);
    };

    const paintDots = (i) => {
      dots.forEach((d, k) => gsap.to(d, { scaleX: k <= i ? 1 : 0, duration: 0.6, ease: 'io' }));
      nextBtn.textContent = i === SLIDES.length - 1 ? 'Inizia il test' : 'Avanti';
      setGlow(SLIDES[i].s, 0.24);
    };

    const show = (to) => {
      if (busy || to === idx || to < 0 || to >= SLIDES.length) return;
      busy = true;
      const dir = to > idx ? 1 : -1;
      const from = slides[idx];
      const next = slides[to];
      gsap.timeline({ onComplete: () => { busy = false; } })
        .to(from, { xPercent: -18 * dir, opacity: 0, duration: 0.5, ease: 'power2.in' })
        .add(() => {
          from.classList.remove('on');
          from.setAttribute('aria-hidden', 'true');
          gsap.set(from, { clearProps: 'all' });
          next.classList.add('on');
          next.setAttribute('aria-hidden', 'false');
        })
        .fromTo(next, { xPercent: 14 * dir, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.7, ease: 'out' })
        .add(artIn(to), '<')
        .add(copyIn(to), '<0.05');
      idx = to;
      paintDots(to);
    };

    const finish = () => {
      setOnboarded();
      navigator.storage?.persist?.().catch(() => {});
      go('#/', { replace: true });
    };

    el.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'skip') finish();
      if (act === 'next') {
        if (idx === SLIDES.length - 1) finish();
        else show(idx + 1);
      }
    });

    const obs = Observer.create({
      target: $('.onb-stage', el),
      type: 'touch,pointer',
      dragMinimum: 12,
      tolerance: 40,
      onLeft: () => show(idx + 1),
      onRight: () => show(idx - 1),
    });

    // Prima entrata
    gsap.set(dots, { scaleX: 0 });
    gsap.timeline({ delay: timing.delay })
      .from($('.onb-top', el), { y: -20, opacity: 0, duration: 0.6 })
      .add(artIn(0), 0.05)
      .add(copyIn(0), 0.2)
      .from($('.onb-foot', el), { y: 24, opacity: 0, duration: 0.7 }, 0.5);
    paintDots(0);

    return () => {
      obs.kill();
      splits.forEach((s) => s.revert());
    };
  },
};

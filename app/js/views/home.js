import { gsap, Draggable, setGlow, reduced, timing } from '../anim.js';
import { ALL, EX, SCHEDE } from '../data.js';
import {
  S, doneIn, doneTotal, allTested, nextScheda, estMinutes, workoutsDone, rmOf, workLoad,
} from '../store.js';
import { go } from '../nav.js';
import { plateSVG } from '../ui/gear.js';
import { $, $$, esc, kg, int, dayLabel, minutes, clamp } from '../util.js';

const segs = (s) => `<div class="segs">${s.exercises.map((e) => `<i class="${rmOf(e.id) != null ? 'on' : ''}"></i>`).join('')}</div>`;

function slab(s, sug) {
  const st = S();
  const test = st.phase === 'test';
  const done = doneIn(s.id);
  let badge = '';
  if (st.active?.scheda === s.id) badge = '<span class="badge">In corso</span>';
  else if (s.id === sug) badge = '<span class="badge">Prossima</span>';
  else if (test && done === s.exercises.length) badge = '<span class="badge ghost">Testata</span>';
  return `
    <article class="slab" data-s="${s.id}" aria-label="Scheda ${s.id}">
      ${plateSVG(`Ghisa · Scheda ${s.id} · Workout ${s.workout} · 20 kg · `)}
      <div class="slab-top"><span class="mono">Scheda · Workout ${s.workout}</span>${badge}</div>
      <div class="slab-letter">${s.id}</div>
      <ul class="slab-groups">${s.groups.map((g) => `<li>${esc(g.name)}</li>`).join('')}</ul>
      <div class="slab-foot">
        <div><b class="num">${s.exercises.length}</b><span class="mono">esercizi</span></div>
        ${test
          ? `<div><b class="num">${done}/${s.exercises.length}</b><span class="mono">RM rilevati</span></div>`
          : `<div><b class="num">${s.totalSets}</b><span class="mono">serie</span></div>
             <div><b class="num">~${estMinutes(s.id)}</b><span class="mono">minuti</span></div>`}
      </div>
      ${test ? segs(s) : ''}
    </article>`;
}

function testMap() {
  const done = doneTotal();
  return `
    <section class="section" data-a="rise">
      <div class="section-head"><h2>Mappa del test</h2><span class="mono">${done}/${ALL.length} RM</span></div>
      <div class="map">
        ${SCHEDE.map((s) => `
          <a class="map-row" data-s="${s.id}" href="#/test/${s.id}">
            <span class="chip-l">${s.id}</span>
            ${segs(s)}
            <span class="num">${doneIn(s.id)}<small>/${s.exercises.length}</small></span>
          </a>`).join('')}
      </div>
      ${!allTested() && done > 0 ? '<a class="link-btn skip-test" href="#/fase1">Passa comunque alla Fase 1</a>' : ''}
    </section>`;
}

function phaseInfo() {
  const big = [EX['A-squat'], EX['C-stacco']];
  const last = S().history[0];
  return `
    <section class="section" data-a="rise">
      <div class="section-head"><h2>I due big</h2><span class="mono">70% del massimale</span></div>
      <div class="big2">
        ${big.map((e) => `
          <a class="tile" data-s="${e.scheda}" href="#/massimali">
            <span class="mono">${esc(e.name)} · ${e.sets}×${e.reps}</span>
            <div class="kgv"><b class="num">${kg(workLoad(e))}</b><span>kg</span></div>
            <span class="sub">1RM <b>${kg(rmOf(e.id))} kg</b></span>
          </a>`).join('')}
      </div>
    </section>
    ${last ? `
      <section class="section" data-a="rise">
        <div class="section-head"><h2>Ultima sessione</h2><a class="mono" href="#/diario" data-replace>Diario →</a></div>
        <a class="last" data-s="${last.scheda}" href="#/riepilogo/${last.id}">
          <span class="chip-l">${last.scheda}</span>
          <div><b>${last.type === 'workout' ? `Workout ${last.workout}` : `Test ${last.scheda}`}</b>
            <span class="mono">${dayLabel(last.endedAt)} · ${minutes(last.endedAt - last.startedAt)} min</span></div>
          <span class="num">${last.type === 'workout' ? `${int(last.volume)}<small style="font-size:14px;color:var(--chalk3)"> kg</small>` : `${last.found}<small style="font-size:14px;color:var(--chalk3)"> RM</small>`}</span>
        </a>
      </section>` : ''}`;
}

function ctaFor(s) {
  const st = S();
  const a = st.active;
  if (a?.scheda === s.id) {
    return {
      t: 'Riprendi',
      sub: a.type === 'workout' ? `Workout ${s.workout} in corso` : `Test ${s.id} in corso`,
      href: a.type === 'workout' ? `#/workout/${s.id}` : `#/test/${s.id}`,
    };
  }
  if (st.phase === 'test') {
    if (allTested()) return { t: 'Sblocca la Fase 1', sub: `Test completato · ${ALL.length}/${ALL.length} RM`, href: '#/fase1' };
    const left = s.exercises.length - doneIn(s.id);
    return left
      ? { t: `Test scheda ${s.id}`, sub: `${left} ${left === 1 ? 'esercizio' : 'esercizi'} da misurare`, href: `#/test/${s.id}` }
      : { t: `Rivedi test ${s.id}`, sub: 'Tutti gli RM rilevati', href: `#/test/${s.id}` };
  }
  return { t: `Allenati · ${s.id}`, sub: `Workout ${s.workout} · ${s.totalSets} serie · ~${estMinutes(s.id)} min`, href: `#/workout/${s.id}` };
}

export default {
  render() {
    const st = S();
    const test = st.phase === 'test';
    const sug = nextScheda();
    return `
      <header class="topbar" data-a="rise">
        <div class="wordmark"><span class="marks"><i></i><i></i><i></i><i></i></span>GHISA</div>
        <a class="icon-btn" href="#/impostazioni" aria-label="Impostazioni"><svg class="ico"><use href="#i-sliders"/></svg></a>
      </header>
      <div class="status mono" data-a="rise">
        ${test
          ? `<i class="pulse"></i><span>Fase test · <b>${doneTotal()}</b>/${ALL.length} RM rilevati</span>`
          : `<i class="pulse on"></i><span>Fase 1 · <b>${workoutsDone()}</b> allenamenti chiusi</span>`}
      </div>
      <div class="deck" data-a="deck"><div class="deck-track">${SCHEDE.map((s) => slab(s, sug)).join('')}</div></div>
      <div class="deck-dots" data-a="rise">${SCHEDE.map((s, i) => `<button class="pdot" data-s="${s.id}" data-i="${i}" aria-label="Scheda ${s.id}"></button>`).join('')}</div>
      <a class="btn cta" data-cta data-a="rise" href="#/">
        <span class="cta-label"><b data-cta-t></b><small data-cta-s></small></span>
        <span class="cta-go"><svg class="ico"><use href="#i-arrow"/></svg></span>
      </a>
      ${test ? testMap() : phaseInfo()}`;
  },

  mount(el) {
    const track = $('.deck-track', el);
    const slabs = $$('.slab', el);
    const dots = $$('.pdot', el);
    const cta = $('[data-cta]', el);
    const parts = slabs.map((s) => ({ s, letter: $('.slab-letter', s), plate: $('.plate', s) }));
    let idx = Math.max(0, SCHEDE.findIndex((s) => s.id === nextScheda()));
    let startIdx = idx;
    let step = 1;

    const measure = () => { step = slabs[1].offsetLeft - slabs[0].offsetLeft || 1; };
    measure();

    // Trascinando il mazzo i dischi "rotolano" e le lettere scorrono in parallasse.
    const paint = (x) => {
      const p = -x / step;
      parts.forEach(({ s, letter, plate }, i) => {
        const off = i - p;
        const a = Math.min(Math.abs(off), 1);
        gsap.set(s, { scale: 1 - a * 0.07, opacity: 1 - a * 0.4 });
        gsap.set(letter, { x: off * -70 });
        gsap.set(plate, { rotation: x * 0.4 + i * 37, x: off * 40 });
      });
    };

    const updateCta = (s, animate) => {
      const c = ctaFor(s);
      cta.dataset.s = s.id;
      cta.setAttribute('href', c.href);
      const t = $('[data-cta-t]', cta);
      const sub = $('[data-cta-s]', cta);
      if (!animate || reduced) {
        t.textContent = c.t;
        sub.textContent = c.sub;
        return;
      }
      gsap.timeline()
        .to([t, sub], { yPercent: -110, opacity: 0, duration: 0.18, ease: 'power2.in', stagger: 0.03 })
        .add(() => {
          t.textContent = c.t;
          sub.textContent = c.sub;
        })
        .fromTo([t, sub], { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'out', stagger: 0.05 });
      gsap.fromTo($('.cta-go', cta), { x: -10 }, { x: 0, duration: 0.6, ease: 'back.out(3)' });
    };

    const select = (i, animate = true) => {
      const changed = i !== idx || !animate;
      idx = i;
      dots.forEach((d, k) => d.classList.toggle('on', k === i));
      if (changed) updateCta(SCHEDE[i], animate);
      setGlow(SCHEDE[i].id);
    };

    gsap.set(track, { x: -idx * step });
    paint(-idx * step);
    select(idx, false);

    const [drag] = Draggable.create(track, {
      type: 'x',
      inertia: true,
      edgeResistance: 0.8,
      dragClickables: true,
      bounds: { minX: -(slabs.length - 1) * step, maxX: 0 },
      // Un lancio sposta al massimo di una scheda: il mazzo resta controllabile con un pollice.
      snap: (v) => -clamp(Math.round(-v / step), startIdx - 1, startIdx + 1) * step,
      maxDuration: 0.9,
      minDuration: 0.35,
      onPress() { startIdx = idx; },
      onDrag() { paint(this.x); },
      onThrowUpdate() { paint(this.x); },
      onThrowComplete() { select(Math.round(-this.x / step)); },
      onClick() {
        const slabEl = this.pointerEvent?.target?.closest?.('.slab');
        if (!slabEl) return;
        const i = slabs.indexOf(slabEl);
        if (i === idx) go(cta.getAttribute('href'));
        else goTo(i);
      },
    });

    function goTo(i) {
      gsap.to(track, {
        x: -i * step,
        duration: 0.85,
        ease: 'io',
        onUpdate: () => paint(gsap.getProperty(track, 'x')),
        onComplete: () => drag.update(),
      });
      select(i);
    }

    el.addEventListener('click', (e) => {
      const d = e.target.closest('.pdot');
      if (d) goTo(+d.dataset.i);
    });

    const onResize = () => {
      measure();
      drag.applyBounds({ minX: -(slabs.length - 1) * step, maxX: 0 });
      gsap.set(track, { x: -idx * step });
      paint(-idx * step);
      drag.update();
    };
    window.addEventListener('resize', onResize);

    // Entrata: il mazzo arriva da destra, i dischi girano fino a fermarsi.
    if (!reduced) {
      gsap.from(slabs, { x: 120, duration: 1.2, ease: 'out', stagger: 0.06, delay: timing.delay });
      gsap.from(parts.map((p) => p.plate), { rotation: '-=220', duration: 1.8, ease: 'out', delay: timing.delay });
      gsap.from(parts.map((p) => p.letter), { yPercent: 40, opacity: 0, duration: 1.1, ease: 'out', delay: timing.delay + 0.1, stagger: 0.05 });
    }

    return () => {
      drag.kill();
      window.removeEventListener('resize', onResize);
    };
  },
};

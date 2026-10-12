// Protocollo "Test massimale" per Squat e Stacco: riscaldamento in 8 step sulle percentuali
// di un massimale stimato, poi tentativi al 100% finché si registra il nuovo 1RM.
import {
  gsap, Flip, intro, setGlow, chalkAt, shake, countUp, COLORS, timing,
} from '../anim.js';
import { EX, PROTOCOL } from '../data.js';
import { S, rmOf, autoLoad, saveMaxTest, registerMax } from '../store.js';
import { barbell, weightPicker } from '../ui/gear.js';
import { sheet, confirm } from '../ui/sheet.js';
import { startRest, stopTimer } from '../ui/timer.js';
import {
  $, $$, esc, kg, pad, roundTo, buzz,
} from '../util.js';

const STEPS = PROTOCOL.steps;
const LAST = STEPS.length;

function loadFor(st, est) {
  const { bar, round } = S().settings;
  if (st.pct == null) return bar;
  return Math.max(bar, roundTo((est * st.pct) / 100, round));
}

const repsLabel = (st) => (st.sets > 1 ? `${st.sets}×${st.reps}` : `×${st.reps}`);

function ramp(est, cur) {
  return STEPS.map((st) => {
    let cls = '';
    if (cur) cls = st.step < cur ? 'done' : st.step === cur ? 'cur' : '';
    if (st.step === LAST) cls += ' last';
    return `
      <li class="${cls}" data-step="${st.step}" data-flip-id="st${st.step}">
        <span class="mono">${pad(st.step)}</span>
        <span style="display:flex;flex-direction:column;gap:5px">
          <span class="mono" style="font-size:9.5px">${st.pct ? `${st.pct}%` : 'vuoto'}${st.rest ? ` · rec ${st.rest}′` : ''}</span>
          <span class="r-bar"><i style="--w:${(st.pct ?? 14) / 100}"></i></span>
        </span>
        <span class="r-kg num" data-kg>${kg(loadFor(st, est))}<small>kg</small></span>
        <span class="r-reps mono">${repsLabel(st)}</span>
      </li>`;
  }).join('');
}

function attemptsList(mt) {
  const at = mt.attempts.slice().reverse();
  if (!at.length) return '<div class="ladder-empty">Primo tentativo al 100% della stima. Puoi cambiare il carico qui sotto.</div>';
  const max = Math.max(...at.map((a) => a.kg));
  return at.map((a, i) => `
    <div class="rung ${a.ok ? 'ok' : 'ko'}" data-flip-id="${a.t}">
      <span class="mono">#${at.length - i}</span>
      <span class="bar-w"><i style="--w:${(a.kg / max).toFixed(3)}"></i></span>
      <b class="num">${kg(a.kg)}</b>
      <svg class="ico"><use href="#i-${a.ok ? 'check' : 'x'}"/></svg>
    </div>`).join('');
}

const bestOf = (mt) => {
  const ok = mt.attempts.filter((a) => a.ok).map((a) => a.kg);
  return ok.length ? Math.max(...ok) : null;
};

export default {
  render(id) {
    const e = EX[id];
    if (!e || !e.oneRM) return null;
    return `
      <header class="bar">
        <button class="icon-btn" data-back="#/test/${e.scheda}" aria-label="Indietro"><svg class="ico"><use href="#i-back"/></svg></button>
        <span class="bar-title mono" data-bt>Protocollo 1RM · ${esc(e.name)}</span><span></span>
      </header>
      <div data-body></div>`;
  },

  intro() {},

  mount(el, id) {
    const e = EX[id];
    el.dataset.s = e.scheda;
    el.classList.add('flush');
    setGlow(e.scheda);
    const body = $('[data-body]', el);
    let killers = [];
    let doneKg = null;

    const mt = () => S().maxtest[id];
    const save = (patch) => saveMaxTest(id, { ...mt(), ...patch });
    const cleanupStage = () => {
      killers.forEach((k) => k());
      killers = [];
    };

    // ---------- Stadi ----------
    function setupHTML() {
      const rm = rmOf(id);
      return `
        <div class="head">
          <span class="mono" data-a="rise">${esc(e.group)} · Test massimale</span>
          <h1 class="h-xl" data-split>${esc(e.name)}</h1>
          <div class="chips" data-a="rise">
            <span class="chip acc">1 RM</span><span class="chip">9 step</span><span class="chip">~${PROTOCOL.minutes} min</span>
            ${rm != null ? `<span class="chip">Attuale ${kg(rm)} kg</span>` : ''}
          </div>
        </div>
        <div class="section-head" data-a="rise"><h2 style="font-size:22px">Massimale stimato</h2><span class="mono">base delle %</span></div>
        <p class="lede small" data-a="rise">Il riscaldamento si calcola su questa stima. Se non conosci il tuo massimale, scegli il peso che pensi di sollevare una volta.</p>
        <div data-wp data-a="rise" style="margin-top:14px"></div>
        <ol class="ramp" data-ramp>${ramp(currentEstimate(), 0)}</ol>
        <div class="console" data-a="rise">
          <button class="btn btn-acc btn-xl" data-act="start"><svg class="ico"><use href="#i-arrow"/></svg>Inizia riscaldamento</button>
        </div>`;
    }

    function runHTML(m) {
      const st = STEPS[m.step - 1];
      const load = loadFor(st, m.estimate);
      const multi = st.sets > 1;
      const label = multi && m.serie < st.sets
        ? `Fatta serie ${m.serie} di ${st.sets}`
        : st.rest ? `Fatto · recupero ${st.rest}′` : 'Fatto · avanti';
      return `
        <div class="head" style="margin:6px 0 8px">
          <span class="mono" data-a="rise">${esc(e.name)} · step ${m.step} di ${LAST}</span>
          <div class="meter knurl" data-a="rise"><i data-meter style="--p:${(m.step - 1) / LAST}"></i></div>
        </div>
        <ol class="ramp" data-ramp>${ramp(m.estimate, m.step)}</ol>
        <div class="console" data-a="rise">
          <div class="step-card">
            <span class="mono">Step ${m.step} · ${st.pct ? `${st.pct}% di ${kg(m.estimate)} kg` : st.note}${multi ? ` · serie ${m.serie}/${st.sets}` : ''}</span>
            <div class="big-load"><b class="num" data-load>${kg(load)}</b><span>kg</span></div>
            <div class="step-reps">× <b>${st.reps}</b> ripetizioni</div>
            <div class="bb" data-bb></div>
          </div>
          <button class="btn btn-acc btn-xl" data-act="next" style="margin-top:12px"><svg class="ico"><use href="#i-check"/></svg>${label}</button>
          <div style="display:flex;justify-content:space-between;margin-top:2px">
            <button class="link-btn" data-act="recal">Ricalibra la stima</button>
            <button class="link-btn" data-act="restart">Ricomincia</button>
          </div>
        </div>`;
    }

    function testHTML(m) {
      const best = bestOf(m);
      return `
        <div class="head" style="margin:6px 0 0">
          <span class="mono" data-a="rise">${esc(e.name)} · step ${LAST} di ${LAST}</span>
          <h1 class="h-l" data-split>Test massimale</h1>
          <p class="lede small" data-a="rise">Un tentativo alla volta. Se lo chiudi pulito puoi salire; se manchi, recupera e riprova o registra il migliore.</p>
          <div class="meter knurl" data-a="rise"><i style="--p:1"></i></div>
        </div>
        <div class="section-head" style="margin:20px 0 0" data-a="rise"><h2 style="font-size:20px">Tentativi</h2><span class="mono">stima ${kg(m.estimate)} kg</span></div>
        <div class="ladder" data-ladder>${attemptsList(m)}</div>
        <div class="console" data-a="rise">
          <div data-wp></div>
          <div class="console-row">
            <button class="btn btn-ghost" data-act="ko"><svg class="ico"><use href="#i-x"/></svg>Mancato</button>
            <button class="btn btn-acc" data-act="ok"><svg class="ico"><use href="#i-check"/></svg>Sollevato</button>
          </div>
          <div data-reg>${best != null ? regBtn(best) : ''}</div>
        </div>`;
    }

    const regBtn = (best) => `<button class="btn btn-chalk btn-xl" data-act="register" style="margin-top:10px">Registra ${kg(best)} kg come 1RM</button>`;

    function doneHTML(v) {
      return `
        <div class="done-hero">
          <span class="mono" data-a="rise">${esc(e.name)} · massimale registrato</span>
          <div class="mega num" data-mega>${kg(v)}</div>
          <div class="unit" data-a="rise">kg · 1RM</div>
          <div class="phase-card" data-a="rise">
            <div><span class="mono">Fase 1 · ${e.sets}×${e.reps}</span><div class="num">${kg(autoLoad(e))} kg</div></div>
            <span class="h-m">70%</span>
          </div>
          <button class="btn btn-chalk btn-xl" data-back="#/test/${e.scheda}" data-a="rise">Torna al test ${e.scheda}</button>
        </div>`;
    }

    function currentEstimate() {
      return mt()?.estimate ?? rmOf(id) ?? (id === 'A-squat' ? 80 : 100);
    }

    // ---------- Pittura ----------
    function paint(mode = 'full', first = false) {
      cleanupStage();
      const m = mt();
      let html;
      if (doneKg != null) html = doneHTML(doneKg);
      else if (!m) html = setupHTML();
      else if (m.step < LAST) html = runHTML(m);
      else html = testHTML(m);
      body.innerHTML = html;
      bindStage(m);
      if (mode === 'step') {
        // Cambio step leggero: solo la console si rinnova, la barra avanza dal valore precedente.
        gsap.from($$('.step-card > *, .console > .btn', body), { y: 22, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'out' });
        const meter = $('[data-meter]', body);
        if (meter && m) gsap.from(meter, { scaleX: Math.max(0, m.step - 2) / LAST, duration: 0.9, ease: 'io' });
      } else {
        intro(body, first ? timing.delay : 0.05);
      }
      if (doneKg != null) celebrate();
    }

    function bindStage(m) {
      if (doneKg != null) return;
      if (!m) {
        const rampEl = $('[data-ramp]', body);
        const wp = weightPicker($('[data-wp]', body), {
          kind: 'barbell',
          value: currentEstimate(),
          bar: S().settings.bar,
          showBar: false,
          onChange: (v) => {
            $$('li', rampEl).forEach((li, i) => {
              li.querySelector('[data-kg]').innerHTML = `${kg(loadFor(STEPS[i], v))}<small>kg</small>`;
            });
          },
        });
        body._est = () => wp.get();
        killers.push(wp.kill);
        gsap.fromTo($$('li', rampEl), { x: 30, opacity: 0 }, {
          x: 0, opacity: 1, duration: 0.6, stagger: 0.04, delay: 0.25, clearProps: 'transform,opacity',
        });
        return;
      }
      if (m.step < LAST) {
        const st = STEPS[m.step - 1];
        const draw = barbell($('[data-bb]', body), () => S().settings.bar);
        draw(loadFor(st, m.estimate));
        const cur = $('[data-ramp] li.cur', body);
        if (cur) setTimeout(() => cur.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
        return;
      }
      const lastA = m.attempts.at(-1);
      const start = lastA ? (lastA.ok ? lastA.kg + 2.5 : lastA.kg) : m.estimate;
      const wp = weightPicker($('[data-wp]', body), { kind: 'barbell', value: start, bar: S().settings.bar });
      body._w = () => wp.get();
      body._wp = wp;
      killers.push(wp.kill);
    }

    // ---------- Azioni ----------
    function start() {
      const est = body._est ? body._est() : currentEstimate();
      saveMaxTest(id, { estimate: est, step: 1, serie: 1, attempts: [], startedAt: Date.now() });
      transition(() => paint());
    }

    function next() {
      const m = mt();
      const st = STEPS[m.step - 1];
      buzz(30);
      chalkAt($('[data-load]', body), { color: COLORS[e.scheda], n: 18, power: 0.7 });
      if (st.sets > 1 && m.serie < st.sets) {
        save({ serie: m.serie + 1 });
        paint('step');
        return;
      }
      const nextStep = m.step + 1;
      // Il cambio step anima la rampa con Flip: lo step corrente scivola verso il basso.
      const state = Flip.getState($$('[data-ramp] li', body), { props: 'backgroundColor,borderColor,opacity' });
      save({ step: nextStep, serie: 1 });
      if (nextStep === LAST) paint();
      else paint('step');
      Flip.from(state, { targets: $$('[data-ramp] li', body), duration: 0.6, ease: 'out', props: 'backgroundColor,borderColor,opacity' });
      if (st.rest) {
        const ns = STEPS[nextStep - 1];
        startRest(st.rest * 60, {
          label: nextStep === LAST
            ? `Poi il test massimale: ${kg(loadFor(ns, m.estimate))} kg`
            : `Prossimo: step ${nextStep} · ${kg(loadFor(ns, m.estimate))} kg ${repsLabel(ns)}`,
          scheda: e.scheda,
        });
      }
    }

    function tryMax(ok) {
      const m = mt();
      const w = body._w();
      const attempts = [...m.attempts, { kg: w, ok, t: Date.now() }];
      save({ attempts });
      const ladderEl = $('[data-ladder]', body);
      const state = Flip.getState($$('.rung', ladderEl));
      ladderEl.innerHTML = attemptsList(mt());
      Flip.from(state, {
        targets: $$('.rung', ladderEl),
        duration: 0.55,
        ease: 'out',
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 0.6, ease: 'lift' }),
      });
      const best = bestOf(mt());
      const reg = $('[data-reg]', body);
      const had = !!reg.firstElementChild;
      reg.innerHTML = best != null ? regBtn(best) : '';
      if (best != null && !had) gsap.from(reg.firstElementChild, { y: 20, opacity: 0, duration: 0.6, ease: 'lift' });
      if (ok) {
        body._wp.set(w + 2.5);
        chalkAt(ladderEl.querySelector('.rung .num') || ladderEl, { color: COLORS[e.scheda], n: 40, power: 1.1 });
        buzz([30, 40, 80]);
      } else {
        shake($('.console', body), 6);
      }
      startRest(300, {
        label: ok ? `Sollevati ${kg(w)} kg. Riprova più pesante o registra.` : `Mancato a ${kg(w)} kg. Riprova o registra ${best != null ? kg(best) + ' kg' : 'più leggero'}.`,
        scheda: e.scheda,
      });
    }

    async function register() {
      const m = mt();
      const best = bestOf(m);
      if (best == null) return;
      stopTimer();
      registerMax(id, best, m.attempts);
      doneKg = best;
      transition(() => paint());
    }

    function recalibrate() {
      const m = mt();
      let picker;
      sheet({
        accent: e.scheda,
        html: `
          <div class="sheet-head"><span class="mono">${esc(e.name)} · protocollo</span><h2 class="sheet-title">Ricalibra la stima</h2></div>
          <p class="sheet-text">Se i carichi ti sembrano troppo leggeri o pesanti, aggiorna la stima: gli step successivi si ricalcolano.</p>
          <div data-wp></div>
          <button class="btn btn-acc btn-xl" data-x="save">Aggiorna stima</button>`,
        onMount(panel, close) {
          picker = weightPicker($('[data-wp]', panel), { kind: 'barbell', value: m.estimate, bar: S().settings.bar, showBar: false });
          panel.addEventListener('click', (ev) => {
            if (!ev.target.closest('[data-x="save"]')) return;
            save({ estimate: picker.get() });
            close();
            paint();
          });
        },
        onClose: () => picker?.kill(),
      });
    }

    async function restart() {
      const yes = await confirm({ title: 'Ricominciare?', text: 'Il protocollo riparte dalla stima del massimale.', ok: 'Ricomincia', accent: e.scheda });
      if (!yes) return;
      stopTimer();
      saveMaxTest(id, null);
      transition(() => paint());
    }

    function transition(fn, quick = false) {
      gsap.to(body, {
        opacity: 0,
        y: quick ? 0 : -16,
        duration: quick ? 0.15 : 0.25,
        ease: 'power2.in',
        onComplete: () => {
          fn();
          gsap.fromTo(body, { opacity: 0, y: quick ? 0 : 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'out', clearProps: 'transform' });
        },
      });
    }

    function celebrate() {
      const mega = $('[data-mega]', body);
      gsap.timeline({ delay: 0.3 })
        .from(mega, { scale: 0.5, opacity: 0, duration: 0.5, ease: 'back.out(2)' })
        .add(countUp(mega, doneKg, { dur: 1.1 }), 0)
        .add(() => {
          chalkAt(mega, { color: COLORS[e.scheda], n: 60, power: 1.5 });
          buzz([40, 30, 90]);
        }, 1.05)
        .fromTo(mega, { scale: 1 }, { keyframes: { scale: [1.08, 0.98, 1] }, duration: 0.5 }, 1.05);
    }

    body.addEventListener('click', (ev) => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'start') start();
      else if (act === 'next') next();
      else if (act === 'ok') tryMax(true);
      else if (act === 'ko') tryMax(false);
      else if (act === 'register') register();
      else if (act === 'recal') recalibrate();
      else if (act === 'restart') restart();
    });

    paint('full', true);
    return cleanupStage;
  },
};

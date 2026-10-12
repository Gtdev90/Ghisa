import { gsap, Flip, setGlow, chalkAt, scramble, shake, COLORS } from '../anim.js';
import { EX, KIND, schedaById } from '../data.js';
import { S, logAttempt, removeAttempt, prevRmOf } from '../store.js';
import { weightPicker } from '../ui/gear.js';
import { confirm, toast } from '../ui/sheet.js';
import { startRest } from '../ui/timer.js';
import { $, esc, kg, pad, buzz } from '../util.js';

function ladder(e) {
  const r = S().rm[e.id];
  const at = (r?.attempts || []).slice().reverse();
  if (!at.length) return '<div class="ladder-empty">Ancora nessun tentativo. Scegli un carico di partenza qui sotto e prova.</div>';
  const max = Math.max(...at.map((a) => a.kg), 1);
  let bestMarked = false;
  return at.map((a, i) => {
    const best = a.ok && a.kg === r.kg && !bestMarked;
    if (best) bestMarked = true;
    return `
      <button class="rung ${a.ok ? 'ok' : 'ko'} ${best ? 'best' : ''}" data-t="${a.t}" data-flip-id="${a.t}" aria-label="Tentativo ${kg(a.kg)} kg ${a.ok ? 'riuscito' : 'fallito'}">
        <span class="mono">#${at.length - i}</span>
        <span class="bar-w"><i style="--w:${Math.max(0.04, a.kg / max).toFixed(3)}"></i></span>
        <b class="num">${kg(a.kg)}</b>
        <svg class="ico"><use href="#i-${a.ok ? 'check' : 'x'}"/></svg>
      </button>`;
  }).join('');
}

export default {
  render(id) {
    const e = EX[id];
    if (!e || e.oneRM) return null;
    const s = schedaById(e.scheda);
    const r = S().rm[id];
    const prev = prevRmOf(id);
    return `
      <header class="bar">
        <button class="icon-btn" data-back="#/test/${e.scheda}" aria-label="Indietro"><svg class="ico"><use href="#i-back"/></svg></button>
        <span class="bar-title mono">Test ${e.scheda} · ${pad(e.n)}/${pad(s.exercises.length)}</span>
        <button class="text-btn bar-right" data-back="#/test/${e.scheda}">Fine</button>
      </header>
      <div class="head" style="margin-bottom:0">
        <span class="mono" data-a="rise">${esc(e.group)} · ${KIND[e.kind].short}</span>
        <h1 class="h-l" data-split>${esc(e.name)}</h1>
        <div class="rm-target" data-a="rise"><span class="mono">Trova il tuo</span><b class="num">${e.testReps}</b><span class="mono">RM</span></div>
        <p class="lede" data-a="rise">Il peso più alto con cui chiudi <b style="color:var(--chalk)">${e.testReps} ripetizioni</b> pulite. Parti leggero, sali a ogni tentativo e recupera tra uno e l'altro.</p>
      </div>
      <div class="rm-record" data-a="rise">
        <div>
          <span class="mono">RM attuale</span>
          <div class="rec"><b class="num" data-rm>${kg(r?.kg)}</b><span>kg</span></div>
        </div>
        <div class="prev">${prev != null ? `<span class="mono">Ciclo precedente</span><div class="num" style="font-size:24px">${kg(prev)} kg</div>` : ''}</div>
        <span class="stamp" data-stamp>Nuovo RM</span>
      </div>
      <div class="section-head" style="margin:24px 0 0" data-a="rise"><h2 style="font-size:20px">Tentativi</h2><span class="mono">tocca per eliminare</span></div>
      <div class="ladder" data-ladder>${ladder(e)}</div>
      <div class="console" data-a="rise">
        <div data-wp></div>
        <div class="console-row">
          <button class="btn btn-ghost" data-act="ko"><svg class="ico"><use href="#i-x"/></svg>Non chiuse</button>
          <button class="btn btn-acc" data-act="ok"><svg class="ico"><use href="#i-check"/></svg>Chiuse ${e.testReps}</button>
        </div>
      </div>`;
  },

  mount(el, id) {
    const e = EX[id];
    const K = KIND[e.kind];
    el.dataset.s = e.scheda;
    el.classList.add('flush');
    setGlow(e.scheda);

    const r = S().rm[id];
    const last = r?.attempts.at(-1);
    const startV = last ? (last.ok ? last.kg + K.step : last.kg) : (r?.kg ?? K.start);
    const wp = weightPicker($('[data-wp]', el), { kind: e.kind, value: startV, bar: S().settings.bar });
    const ladderEl = $('[data-ladder]', el);
    const rmEl = $('[data-rm]', el);
    const stamp = $('[data-stamp]', el);

    const repaintLadder = (animateNew) => {
      const state = Flip.getState(ladderEl.querySelectorAll('.rung'));
      ladderEl.innerHTML = ladder(e);
      Flip.from(state, {
        targets: ladderEl.querySelectorAll('.rung'),
        duration: 0.55,
        ease: 'out',
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: -18, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'lift' }),
      });
      if (animateNew) {
        const bar = ladderEl.querySelector('.rung .bar-w i');
        if (bar) gsap.from(bar, { scaleX: 0, duration: 0.9, ease: 'io', delay: 0.1 });
      }
    };

    async function attempt(ok) {
      if (S().active?.type === 'workout') {
        const yes = await confirm({
          title: 'Allenamento aperto',
          text: 'Registrare un tentativo di test chiude l\'allenamento in corso (le serie fatte restano salvate). Procedere?',
          ok: 'Chiudi e continua',
          accent: e.scheda,
        });
        if (!yes) return;
      }
      const w = wp.get();
      const isNew = logAttempt(id, w, ok);
      repaintLadder(true);
      const best = S().rm[id]?.kg;
      if (isNew) {
        scramble(rmEl, kg(best));
        chalkAt(rmEl, { color: COLORS[e.scheda], n: 36 });
        buzz([20, 40, 70]);
        gsap.timeline()
          .fromTo(stamp, { scale: 2.6, opacity: 0, rotation: -22 }, { scale: 1, opacity: 1, rotation: -6, duration: 0.5, ease: 'back.out(2)' })
          .to(stamp, { opacity: 0, duration: 0.6, delay: 2.4 });
      } else {
        rmEl.textContent = kg(best);
        if (!ok) shake($('.console', el), 6);
      }
      const nextKg = ok ? w + K.step : w;
      if (ok) wp.set(nextKg);
      startRest(S().settings.restTest, {
        label: ok ? `${e.name} · prossimo tentativo a ${kg(nextKg)} kg` : `${e.name} · riprova o chiudi qui: l'RM resta ${kg(best)} kg`,
        scheda: e.scheda,
      });
    }

    el.addEventListener('click', async (ev) => {
      const act = ev.target.closest('[data-act]')?.dataset.act;
      if (act === 'ok' || act === 'ko') {
        attempt(act === 'ok');
        return;
      }
      const rung = ev.target.closest('.rung');
      if (rung) {
        const t = +rung.dataset.t;
        const a = S().rm[id]?.attempts.find((x) => x.t === t);
        if (!a) return;
        const yes = await confirm({
          title: 'Elimina tentativo',
          text: `Tolgo il tentativo da <b>${kg(a.kg)} kg</b> (${a.ok ? 'riuscito' : 'fallito'}). L'RM viene ricalcolato.`,
          ok: 'Elimina',
          danger: true,
          accent: e.scheda,
        });
        if (!yes) return;
        removeAttempt(id, t);
        repaintLadder(false);
        rmEl.textContent = kg(S().rm[id]?.kg);
        toast('Tentativo eliminato');
      }
    });

    return () => wp.kill();
  },
};

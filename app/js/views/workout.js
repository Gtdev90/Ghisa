import {
  gsap, setGlow, chalkAt, punch, COLORS, reduced, timing,
} from '../anim.js';
import { KIND, schedaById, EX } from '../data.js';
import {
  S, rmOf, autoLoad, todayLoad, estMinutes, lastSetsOf, startWorkout, finishSession, discardSession,
  doSet, undoSet, setTodayLoad, setOverride,
} from '../store.js';
import { go, back } from '../nav.js';
import { barbellSVG, weightPicker } from '../ui/gear.js';
import { sheet, confirm, toast } from '../ui/sheet.js';
import { startRest, stopTimer } from '../ui/timer.js';
import { holdButton } from '../ui/hold.js';
import {
  $, $$, esc, kg, pad, elapsed, buzz,
} from '../util.js';

const act = (sid) => {
  const a = S().active;
  return a?.type === 'workout' && a.scheda === sid ? a : null;
};

function tagFor(e) {
  const a = S().active;
  if (a?.loads?.[e.id] != null) return 'solo oggi';
  if (S().overrides[e.id] != null) return 'carico personalizzato';
  if (rmOf(e.id) == null) return 'tocca per impostare';
  return e.oneRM ? `70% · 1RM ${kg(rmOf(e.id))}` : `100% · ${e.testReps} RM`;
}

function lastLine(e) {
  const it = lastSetsOf(e.id);
  if (!it) return '';
  const same = it.sets.every((x) => x.kg === it.sets[0].kg);
  const reps = it.sets.map((x) => x.reps).join('·');
  return `<div class="xc-last mono">Ultima volta <b>${reps}</b> @ <b>${same ? `${kg(it.sets[0].kg)} kg` : it.sets.map((x) => kg(x.kg)).join('/')}</b></div>`;
}

function setBtn(e, i, rec, isNext) {
  return `
    <button class="set ${rec ? 'done' : ''} ${isNext ? 'next' : ''}" data-act="set" data-i="${i}" style="--f:${rec ? 1 : 0}" aria-label="Serie ${i + 1}${rec ? ' fatta' : ''}">
      <span class="num">${rec ? rec.reps : e.reps}</span>
      <span class="mono">${rec ? `${kg(rec.kg)} kg` : `serie ${i + 1}`}</span>
    </button>`;
}

function body(e, a) {
  const load = todayLoad(e);
  const sets = a?.sets[e.id] || [];
  const nextI = Array.from({ length: e.sets }, (_, i) => i).find((i) => !sets[i]);
  const bar = S().settings.bar;
  return `
    <div class="xc-inner">
      <div class="mono">${esc(e.group)} · ${KIND[e.kind].label}</div>
      <div class="xc-load" style="margin-top:12px">
        <div class="xc-sr"><span>${e.sets}</span><i>×</i><span>${e.reps}</span></div>
        <button class="xc-kg ${load == null ? 'empty' : ''}" data-act="load" aria-label="Cambia carico">
          <span class="num">${load != null ? kg(load) : '—'}<small>kg</small></span>
          <span class="mono">${tagFor(e)}</span>
        </button>
      </div>
      ${e.kind === 'barbell' && load != null ? (() => { const b = barbellSVG(load, bar); return `<div class="bb">${b.svg}<div class="bb-label mono">${b.label}</div></div>`; })() : ''}
      <div class="sets">${Array.from({ length: e.sets }, (_, i) => setBtn(e, i, sets[i], i === nextI)).join('')}</div>
      ${lastLine(e)}
    </div>`;
}

function card(e, a) {
  const sets = a?.sets[e.id] || [];
  const doneN = sets.filter(Boolean).length;
  const complete = doneN >= e.sets;
  const load = todayLoad(e);
  return `
    <article class="xc ${complete ? 'complete' : ''}" data-ex="${e.id}" data-a="rise">
      <button class="xc-head" data-act="toggle" aria-expanded="false">
        <span class="xc-n mono">${complete ? '✓' : pad(e.n)}</span>
        <span class="xc-name">${esc(e.name)}<small>${e.sets}×${e.reps} · ${load != null ? `${kg(load)} kg` : 'carico da definire'}</small></span>
        <span class="xc-dots">${Array.from({ length: e.sets }, (_, i) => `<i class="${sets[i] ? 'on' : ''}"></i>`).join('')}</span>
      </button>
      <div class="xc-body">${body(e, a)}</div>
    </article>`;
}

const dockHTML = (a) => (a
  ? `<button class="btn btn-ghost btn-xl hold" data-hold><span class="hold-fill knurl"></span><span class="hold-label">Tieni premuto per chiudere</span></button>`
  : `<button class="btn btn-acc btn-xl" data-act="start"><svg class="ico"><use href="#i-arrow"/></svg>Inizia allenamento</button>`);

export default {
  render(sid) {
    const s = schedaById(sid);
    const a = act(sid);
    const done = a ? Object.values(a.sets).flat().filter(Boolean).length : 0;
    const missing = s.exercises.filter((e) => todayLoad(e) == null);
    return `
      <header class="bar">
        <button class="icon-btn" data-back="#/" aria-label="Indietro"><svg class="ico"><use href="#i-back"/></svg></button>
        <span class="bar-title mono">Fase 1 · Scheda ${sid}</span>
        <span class="clock bar-right" data-clock>${a ? elapsed(Date.now() - a.startedAt) : ''}</span>
      </header>
      <div class="head">
        <div class="head-row">
          <span class="head-letter" data-a="pop">${sid}</span>
          <div>
            <span class="mono" data-a="rise">${s.exercises.length} esercizi · ${s.totalSets} serie · ~${estMinutes(sid)} min</span>
            <h1 class="h-xl" data-split>Workout ${s.workout}</h1>
          </div>
        </div>
        <div class="meter knurl" data-a="rise"><i data-meter style="--p:${done / s.totalSets}"></i></div>
        <div class="meter-label" data-a="rise"><span class="mono" data-done>${done}/${s.totalSets} serie</span><span class="mono">${a ? 'In corso' : 'Pronto'}</span></div>
      </div>
      ${missing.length ? `<div class="xc-warn" data-a="rise">${missing.length === 1 ? '1 esercizio non ha' : `${missing.length} esercizi non hanno`} un RM: tocca il carico per impostarlo.</div>` : ''}
      <div class="cards">${s.exercises.map((e) => card(e, a)).join('')}</div>
      <div class="dock" data-dock>${dockHTML(a)}</div>`;
  },

  mount(el, sid) {
    const s = schedaById(sid);
    el.dataset.s = sid;
    el.classList.add('flush');
    setGlow(sid);
    const { restMain, restAcc } = S().settings;
    let openCard = null;

    const cardOf = (id) => el.querySelector(`.xc[data-ex="${id}"]`);
    const setsOf = (id) => act(sid)?.sets[id] || [];
    const doneCount = () => Object.values(act(sid)?.sets || {}).flat().filter(Boolean).length;
    const isComplete = (e) => setsOf(e.id).filter(Boolean).length >= e.sets;

    function open(c, animate = true, scroll = true) {
      if (openCard === c) return;
      if (openCard) close(openCard);
      openCard = c;
      c.classList.add('open');
      $('.xc-head', c).setAttribute('aria-expanded', 'true');
      const b = $('.xc-body', c);
      if (!animate || reduced) {
        gsap.set(b, { height: 'auto' });
        return;
      }
      gsap.fromTo(b, { height: 0 }, { height: 'auto', duration: 0.6, ease: 'out' });
      gsap.from($$('.set', c), { scale: 0.3, opacity: 0, duration: 0.6, stagger: 0.05, ease: 'back.out(2.2)', delay: 0.12 });
      gsap.from($$('.bb-plate', c), { scaleY: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: 0.02, ease: 'back.out(2)', delay: 0.15 });
      if (scroll) setTimeout(() => {
        const top = c.offsetTop - 70;
        if (Math.abs(el.scrollTop - top) > 40) el.scrollTo({ top, behavior: 'smooth' });
      }, 260);
    }

    function close(c) {
      c.classList.remove('open');
      $('.xc-head', c).setAttribute('aria-expanded', 'false');
      gsap.to($('.xc-body', c), { height: 0, duration: 0.45, ease: 'io' });
      if (openCard === c) openCard = null;
    }

    function rerenderCard(e) {
      const c = cardOf(e.id);
      const wasOpen = c.classList.contains('open');
      const tmp = document.createElement('div');
      tmp.innerHTML = card(e, act(sid));
      const fresh = tmp.firstElementChild;
      c.replaceWith(fresh);
      if (openCard === c) openCard = null;
      if (wasOpen) {
        fresh.classList.add('open');
        $('.xc-head', fresh).setAttribute('aria-expanded', 'true');
        gsap.set($('.xc-body', fresh), { height: 'auto' });
        openCard = fresh;
      }
      return fresh;
    }

    function paintProgress() {
      const done = doneCount();
      gsap.to($('[data-meter]', el), { '--p': done / s.totalSets, duration: 0.8, ease: 'io' });
      $('[data-done]', el).textContent = `${done}/${s.totalSets} serie`;
    }

    async function ensureStarted() {
      if (act(sid)) return true;
      const other = S().active;
      if (other) {
        const name = other.type === 'workout' ? `Workout ${schedaById(other.scheda).workout}` : `Test ${other.scheda}`;
        const yes = await confirm({
          title: 'Sessione aperta',
          text: `C'è già una sessione in corso (<b>${name}</b>). La chiudo e la salvo nel diario?`,
          ok: 'Chiudi e inizia',
          accent: sid,
        });
        if (!yes) return false;
        stopTimer();
      }
      startWorkout(sid);
      const dock = $('[data-dock]', el);
      dock.innerHTML = dockHTML(act(sid));
      bindHold();
      gsap.from(dock.firstElementChild, { y: 30, opacity: 0, duration: 0.6, ease: 'lift' });
      el.querySelector('.meter-label .mono:last-child').textContent = 'In corso';
      buzz(20);
      return true;
    }

    async function tapSet(c, i) {
      const e = EX[c.dataset.ex];
      if (!(await ensureStarted())) return;
      const rec = setsOf(e.id)[i];
      if (rec) {
        editSet(e, i, rec);
        return;
      }
      const load = todayLoad(e);
      if (load == null) {
        toast('Prima imposta il carico');
        editLoad(e);
        return;
      }
      doSet(e.id, i, { reps: e.reps, kg: load, t: Date.now() });

      const btn = $$('.set', c)[i];
      btn.classList.add('done');
      btn.classList.remove('next');
      btn.querySelector('.mono').textContent = `${kg(load)} kg`;
      gsap.fromTo(btn, { '--f': 0 }, { '--f': 1, duration: 0.5, ease: 'out' });
      punch(btn, 1.16);
      chalkAt(btn, { color: COLORS[sid], n: 16, power: 0.6 });
      buzz(35);
      $$('.xc-dots i', c)[i].classList.add('on');
      const nextBtn = $$('.set', c).find((b) => !b.classList.contains('done'));
      nextBtn?.classList.add('next');
      paintProgress();

      const doneN = setsOf(e.id).filter(Boolean).length;
      const following = s.exercises.find((x) => x.n > e.n && !isComplete(x)) || s.exercises.find((x) => !isComplete(x));
      if (doneN >= e.sets) {
        c.classList.add('complete');
        $('.xc-n', c).textContent = '✓';
        setTimeout(() => {
          if (following) open(cardOf(following.id));
          else close(c);
        }, 650);
      }
      if (doneCount() >= s.totalSets) {
        stopTimer();
        chalkAt($('[data-dock]', el), { color: COLORS[sid], n: 70, power: 1.6 });
        buzz([40, 40, 40, 40, 120]);
        toast('Tutte le serie fatte. Tieni premuto per chiudere l\'allenamento.', { ms: 4200 });
        return;
      }
      const label = doneN < e.sets
        ? `Prossima: ${e.name} · serie ${doneN + 1} di ${e.sets}`
        : `Prossimo: ${following.name} · ${following.sets}×${following.reps}${todayLoad(following) != null ? ` @ ${kg(todayLoad(following))} kg` : ''}`;
      startRest(e.oneRM ? restMain : restAcc, { label, scheda: sid });
    }

    function editSet(e, i, rec) {
      let reps = rec.reps;
      let picker;
      sheet({
        accent: sid,
        html: `
          <div class="sheet-head"><span class="mono">${esc(e.name)} · serie ${i + 1}</span><h2 class="sheet-title">Correggi la serie</h2></div>
          <div class="reps-step">
            <button data-r="-1" aria-label="Meno una ripetizione"><svg class="ico"><use href="#i-minus"/></svg></button>
            <output data-reps>${reps}</output>
            <button data-r="1" aria-label="Più una ripetizione"><svg class="ico"><use href="#i-plus"/></svg></button>
          </div>
          <div class="mono" style="text-align:center;margin-top:-8px">ripetizioni fatte</div>
          <div data-wp></div>
          <div class="btn-row">
            <button class="btn btn-ghost" data-x="undo">Annulla serie</button>
            <button class="btn btn-acc" data-x="save">Salva</button>
          </div>`,
        onMount(panel, closeSheet) {
          picker = weightPicker($('[data-wp]', panel), { kind: e.kind, value: rec.kg, bar: S().settings.bar, showBar: false });
          const out = $('[data-reps]', panel);
          panel.addEventListener('click', (ev) => {
            const r = ev.target.closest('[data-r]');
            if (r) {
              reps = Math.max(0, Math.min(60, reps + +r.dataset.r));
              out.textContent = reps;
              punch(out, 1.1);
              return;
            }
            const x = ev.target.closest('[data-x]')?.dataset.x;
            if (x === 'undo') {
              undoSet(e.id, i);
            } else if (x === 'save') {
              doSet(e.id, i, { ...rec, reps, kg: picker.get() });
            } else return;
            closeSheet();
            const fresh = rerenderCard(e);
            if (!isComplete(e)) {
              fresh.classList.remove('complete');
            }
            paintProgress();
          });
        },
        onClose: () => picker?.kill(),
      });
    }

    function editLoad(e) {
      const a = act(sid);
      const auto = autoLoad(e);
      const hasOverride = S().overrides[e.id] != null;
      let picker;
      let mode = a ? 'today' : 'always';
      sheet({
        accent: sid,
        html: `
          <div class="sheet-head"><span class="mono">${esc(e.name)} · ${e.sets}×${e.reps}</span><h2 class="sheet-title">Carico di lavoro</h2></div>
          <p class="sheet-text">${auto != null
            ? `Calcolato: <b style="color:var(--chalk)">${kg(auto)} kg</b> (${e.oneRM ? `70% di 1RM ${kg(rmOf(e.id))} kg` : `100% del tuo ${e.testReps} RM`}).`
            : 'Questo esercizio non ha ancora un RM: scegli il carico con cui lavorare.'}</p>
          <div data-wp></div>
          <div class="seg-mini">
            <button data-m="today" class="${mode === 'today' ? 'on' : ''}" ${a ? '' : 'disabled style="opacity:.35"'}>Solo oggi</button>
            <button data-m="always" class="${mode === 'always' ? 'on' : ''}">Da ora in poi</button>
          </div>
          <button class="btn btn-acc btn-xl" data-x="save">Usa questo carico</button>
          ${hasOverride ? '<button class="link-btn" data-x="auto">Torna al carico calcolato</button>' : ''}`,
        onMount(panel, closeSheet) {
          picker = weightPicker($('[data-wp]', panel), { kind: e.kind, value: todayLoad(e) ?? KIND[e.kind].start, bar: S().settings.bar });
          panel.addEventListener('click', (ev) => {
            const m = ev.target.closest('[data-m]');
            if (m && !m.disabled) {
              mode = m.dataset.m;
              $$('[data-m]', panel).forEach((b) => b.classList.toggle('on', b === m));
              return;
            }
            const x = ev.target.closest('[data-x]')?.dataset.x;
            if (!x) return;
            if (x === 'auto') {
              setOverride(e.id, null);
              if (act(sid)) setTodayLoad(e.id, undefined);
            } else if (mode === 'today') {
              setTodayLoad(e.id, picker.get());
            } else {
              setOverride(e.id, picker.get());
              if (act(sid)) setTodayLoad(e.id, undefined);
            }
            closeSheet();
            const fresh = rerenderCard(e);
            gsap.from($('.xc-kg .num', fresh), { yPercent: 50, opacity: 0, duration: 0.5, ease: 'out' });
          });
        },
        onClose: () => picker?.kill(),
      });
    }

    async function finish() {
      if (!doneCount()) {
        const yes = await confirm({ title: 'Nessuna serie', text: 'Non hai registrato serie. Annullo l\'allenamento?', ok: 'Annulla allenamento', danger: true, accent: sid });
        if (!yes) {
          holdCtl?.reset();
          return;
        }
        stopTimer();
        discardSession();
        back('#/');
        return;
      }
      stopTimer();
      const id = finishSession();
      go(`#/riepilogo/${id}`, { replace: true });
    }

    let holdCtl = null;
    function bindHold() {
      const btn = $('[data-hold]', el);
      if (btn) holdCtl = holdButton(btn, { onDone: finish });
    }
    bindHold();

    el.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-act]');
      if (!t) return;
      const c = t.closest('.xc');
      switch (t.dataset.act) {
        case 'toggle':
          if (c.classList.contains('open')) close(c);
          else open(c);
          break;
        case 'set':
          tapSet(c, +t.dataset.i);
          break;
        case 'load':
          editLoad(EX[c.dataset.ex]);
          break;
        case 'start':
          ensureStarted();
          break;
        default:
      }
    });

    // Apre il primo esercizio non completato.
    const first = s.exercises.find((e) => !isComplete(e));
    if (first) {
      const c = cardOf(first.id);
      setTimeout(() => open(c, true, false), (timing.delay + 0.45) * 1000);
    }

    const clockEl = $('[data-clock]', el);
    const tick = setInterval(() => {
      const a = act(sid);
      clockEl.textContent = a ? elapsed(Date.now() - a.startedAt) : '';
    }, 1000);

    return () => clearInterval(tick);
  },
};

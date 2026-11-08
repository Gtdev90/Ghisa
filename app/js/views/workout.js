import {
  gsap, setGlow, chalkAt, punch, COLORS, reduced, timing,
} from '../anim.js';
import { KIND, schedaById, EX } from '../data.js';
import {
  S, rmOf, autoLoad, todayLoad, currentTargetLoad, estMinutes, lastSetsOf, startWorkout, finishSession, discardSession,
  doSet, undoSet, setTodayLoad, setOverride, currentSetsCount, totalSetsOf, targetRpe,
  analyzeProgression, oneRmPercent, parseReps,
} from '../store.js';
import { go, back } from '../nav.js';
import { barbellSVG, weightPicker } from '../ui/gear.js';
import { sheet, confirm, toast } from '../ui/sheet.js';
import { startRest, stopTimer } from '../ui/timer.js';
import { holdButton } from '../ui/hold.js';
import {
  $, $$, esc, kg, int, pad, elapsed, buzz, roundTo,
} from '../util.js';

const act = (sid) => {
  const a = S().active;
  return a?.type === 'workout' && a.scheda === sid ? a : null;
};

function formatRepRange(e) {
  if (e.oneRM) return `${e.reps}`;
  const { min, max } = parseReps(e.reps);
  return min === max ? `${min}` : `${min}–${max}`;
}

function tagFor(e) {
  const a = S().active;
  const isDeload = S().meso?.isDeload;
  if (isDeload) {
    return S().meso?.deloadType === 'medium' ? 'scarico medio (-10%)' : 'scarico parziale (@7)';
  }
  if (a?.loads?.[e.id] != null) return 'solo oggi';
  if (S().overrides[e.id] != null) return 'carico personalizzato';
  const prog = analyzeProgression(e);
  if (prog?.badge) return prog.badge;
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
  const rpeBadge = rec?.rpe ? `<span class="rpe-tag mono">@${rec.rpe}</span>` : '';
  const targetNum = rec ? rec.reps : (parseReps(e.reps).max || e.reps);
  return `
    <button class="set ${rec ? 'done' : ''} ${isNext ? 'next' : ''}" data-act="set" data-i="${i}" style="--f:${rec ? 1 : 0}" aria-label="Serie ${i + 1}${rec ? ` fatta a ${kg(rec.kg)} kg` : ''}">
      <span class="num">${targetNum}</span>
      <span class="mono">${rec ? `${kg(rec.kg)} kg` : `serie ${i + 1}`}</span>
      ${rpeBadge}
    </button>`;
}

function body(e, a) {
  const count = currentSetsCount(e);
  const load = todayLoad(e);
  const sets = a?.sets[e.id] || [];
  const nextI = Array.from({ length: count }, (_, i) => i).find((i) => !sets[i]);
  const bar = S().settings.bar;
  const partner = e.jsPartner ? EX[e.jsPartner] : null;
  const prog = analyzeProgression(e);
  const repLabel = formatRepRange(e);
  const coachTag = prog.type === 'unlocked'
    ? 'OVERLOAD'
    : (prog.type === '1rm' ? 'PROGRESSIONE %' : (prog.type === 'caution' ? 'CONSOLIDA' : 'DOPPIA PROG.'));

  return `
    <div class="xc-inner">
      <div class="xc-meta-row mono">
        <span>${esc(e.group)} · ${KIND[e.kind].label}</span>
        <span class="meta-pills">
          <span class="pill-tut" title="Cadenza: Eccentrica·Fermo·Concentrica·Fermo">TUT ${e.tut || '2.0.1.0'}</span>
          ${e.js ? `<span class="pill-js" title="Jump Set alternato">${e.js}</span>` : ''}
        </span>
      </div>
      <div class="xc-coach-tip ${prog.type === '1rm' ? 'type-1rm' : prog.type}">
        <div class="xc-coach-header">
          <span class="xc-coach-badge mono">${prog.badge}</span>
          <span class="xc-coach-tag mono">${coachTag}</span>
        </div>
        <div class="xc-coach-note">${esc(prog.note)}</div>
      </div>
      <div class="xc-load" style="margin-top:10px">
        <div class="xc-sr"><span>${count}</span><i>×</i><span>${repLabel}</span></div>
        <button class="xc-kg ${load == null ? 'empty' : ''}" data-act="load" aria-label="Cambia carico">
          <span class="num">${load != null ? kg(load) : '—'}<small>kg</small></span>
          <span class="mono">${tagFor(e)}</span>
        </button>
      </div>
      ${e.kind === 'barbell' && load != null ? (() => { const b = barbellSVG(load, bar); return `<div class="bb">${b.svg}<div class="bb-label mono">${b.label}</div></div>`; })() : ''}
      <div class="sets">${Array.from({ length: count }, (_, i) => setBtn(e, i, sets[i], i === nextI)).join('')}</div>
      ${partner ? `
        <div class="xc-js-link">
          <button class="js-jump-btn mono" data-act="jump-partner" data-partner="${partner.id}">
            <svg class="ico"><use href="#i-refresh"/></svg> Alterna Jump Set con <b>${esc(partner.name)}</b>
          </button>
        </div>` : ''}
      ${lastLine(e)}
    </div>`;
}

function card(e, a) {
  const count = currentSetsCount(e);
  const sets = a?.sets[e.id] || [];
  const doneN = sets.filter(Boolean).length;
  const complete = doneN >= count;
  const load = todayLoad(e);
  const prog = analyzeProgression(e);
  const unlockBadge = prog?.type === 'unlocked' ? `<span class="xc-badge-unlocked">⚡ +${prog.step}kg</span>` : '';
  const repLabel = formatRepRange(e);
  return `
    <article class="xc ${complete ? 'complete' : ''} ${prog?.type === 'unlocked' ? 'is-unlocked' : ''}" data-ex="${e.id}" data-a="rise">
      <button class="xc-head" data-act="toggle" aria-expanded="false">
        <span class="xc-n mono">${complete ? '✓' : pad(e.n)}</span>
        <span class="xc-name">${esc(e.name)}${unlockBadge}<small>${count}×${repLabel} · ${load != null ? `${kg(load)} kg` : 'carico da definire'}${e.js ? ` · ${e.js}` : ''}</small></span>
        <span class="xc-dots">${Array.from({ length: count }, (_, i) => `<i class="${sets[i] ? 'on' : ''}"></i>`).join('')}</span>
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
    const totalSets = totalSetsOf(sid);
    const done = a ? Object.values(a.sets).flat().filter(Boolean).length : 0;
    const missing = s.exercises.filter((e) => todayLoad(e) == null);
    const isDeload = S().meso?.isDeload;
    const week = S().meso?.week ?? 1;
    return `
      <header class="bar">
        <button class="icon-btn" data-back="#/" aria-label="Indietro"><svg class="ico"><use href="#i-back"/></svg></button>
        <span class="bar-title mono">Fase 1 · Scheda ${sid}${isDeload ? ' (Scarico)' : ` (Sett. ${week})`}</span>
        <span class="clock bar-right" data-clock>${a ? elapsed(Date.now() - a.startedAt) : ''}</span>
      </header>
      <div class="head">
        <div class="head-row">
          <span class="head-letter" data-a="pop">${sid}</span>
          <div>
            <span class="mono" data-a="rise">${s.exercises.length} esercizi · ${totalSets} serie · ~${estMinutes(sid)} min</span>
            <h1 class="h-xl" data-split>Workout ${s.workout}</h1>
          </div>
        </div>
        <div class="meter knurl" data-a="rise"><i data-meter style="--p:${done / totalSets}"></i></div>
        <div class="meter-label" data-a="rise"><span class="mono" data-done>${done}/${totalSets} serie</span><span class="mono">${a ? 'In corso' : 'Pronto'}</span></div>
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
    const isComplete = (e) => setsOf(e.id).filter(Boolean).length >= currentSetsCount(e);

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
      const total = totalSetsOf(sid);
      const activeSets = act(sid)?.sets || {};
      const allSets = Object.values(activeSets).flat().filter(Boolean);
      const liveVol = allSets.reduce((acc, x) => acc + x.reps * x.kg, 0);
      gsap.to($('[data-meter]', el), { '--p': done / Math.max(1, total), duration: 0.8, ease: 'io' });
      $('[data-done]', el).innerHTML = `${done}/${total} serie · <b>${int(liveVol)}</b> <small>kg</small>`;
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

    function defaultLoadForSet(e, i) {
      const doneSets = setsOf(e.id);
      if (i > 0 && doneSets[i - 1]?.kg != null) {
        const prev = doneSets[i - 1];
        if (S().settings.autoDrop && (prev.rpe >= 10 || prev.reps < e.reps)) {
          const drop = e.kind === 'barbell' ? S().settings.round : 1.0;
          return Math.max(e.kind === 'barbell' ? S().settings.bar : 1, roundTo(prev.kg - drop, S().settings.round));
        }
        return prev.kg;
      }
      return todayLoad(e);
    }

    async function tapSet(c, i) {
      const e = EX[c.dataset.ex];
      if (!(await ensureStarted())) return;
      const rec = setsOf(e.id)[i];
      if (rec) {
        editSet(e, i, rec);
        return;
      }
      const load = defaultLoadForSet(e, i);
      if (load == null) {
        toast('Prima imposta il carico');
        editLoad(e);
        return;
      }
      const defRpe = targetRpe(e, i);
      const defReps = typeof e.reps === 'number' ? e.reps : parseReps(e.reps).min;
      doSet(e.id, i, { reps: defReps, kg: load, rpe: defRpe, t: Date.now() });

      const btn = $$('.set', c)[i];
      btn.classList.add('done');
      btn.classList.remove('next');
      btn.querySelector('.mono').textContent = `${kg(load)} kg`;
      const rpeTag = btn.querySelector('.rpe-tag');
      if (rpeTag) rpeTag.textContent = `@${defRpe}`;
      else {
        const tag = document.createElement('span');
        tag.className = 'rpe-tag mono';
        tag.textContent = `@${defRpe}`;
        btn.appendChild(tag);
      }
      gsap.fromTo(btn, { '--f': 0 }, { '--f': 1, duration: 0.5, ease: 'out' });
      punch(btn, 1.16);
      chalkAt(btn, { color: COLORS[sid], n: 16, power: 0.6 });
      buzz(35);
      $$('.xc-dots i', c)[i].classList.add('on');
      const nextBtn = $$('.set', c).find((b) => !b.classList.contains('done'));
      nextBtn?.classList.add('next');
      paintProgress();

      const count = currentSetsCount(e);
      const doneN = setsOf(e.id).filter(Boolean).length;
      const partner = e.jsPartner ? EX[e.jsPartner] : null;
      const partnerSets = partner ? setsOf(partner.id).filter(Boolean).length : 0;
      const partnerCount = partner ? currentSetsCount(partner) : 0;
      const isPartnerPending = partner && partnerSets < partnerCount && partnerSets <= doneN;

      const following = isPartnerPending
        ? partner
        : (s.exercises.find((x) => x.n > e.n && !isComplete(x)) || s.exercises.find((x) => !isComplete(x)));

      if (doneN >= count) {
        c.classList.add('complete');
        $('.xc-n', c).textContent = '✓';
        setTimeout(() => {
          if (following) open(cardOf(following.id));
          else close(c);
        }, 650);
      } else if (isPartnerPending) {
        setTimeout(() => {
          open(cardOf(partner.id));
        }, 650);
      }
      const total = totalSetsOf(sid);
      if (doneCount() >= total) {
        stopTimer();
        chalkAt($('[data-dock]', el), { color: COLORS[sid], n: 70, power: 1.6 });
        buzz([40, 40, 40, 40, 120]);
        toast('Tutte le serie fatte. Tieni premuto per chiudere l\'allenamento.', { ms: 4200 });
        return;
      }
      let label;
      if (isPartnerPending) {
        label = `Jump Set: ${partner.name} · serie ${partnerSets + 1} di ${partnerCount}`;
      } else if (doneN < count) {
        label = `Prossima: ${e.name} · serie ${doneN + 1} di ${count}`;
      } else {
        label = `Prossimo: ${following.name} · ${currentSetsCount(following)}×${following.reps}${todayLoad(following) != null ? ` @ ${kg(todayLoad(following))} kg` : ''}`;
      }
      startRest(e.oneRM ? restMain : restAcc, { label, scheda: sid });
    }

    function editSet(e, i, rec) {
      let reps = rec.reps;
      let selectedRpe = rec.rpe || targetRpe(e, i);
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
          <div class="rpe-picker">
            <div class="mono" style="text-align:center;font-size:12px;margin:12px 0 6px">Intensità / Scala RPE (RIR)</div>
            <div class="rpe-row">
              <button class="rpe-btn ${selectedRpe === 7 ? 'on' : ''}" data-rpe="7"><b>@7</b><small>buffer 3</small></button>
              <button class="rpe-btn ${selectedRpe === 8 ? 'on' : ''}" data-rpe="8"><b>@8</b><small>buffer 2</small></button>
              <button class="rpe-btn ${selectedRpe === 9 ? 'on' : ''}" data-rpe="9"><b>@9</b><small>standard</small></button>
              <button class="rpe-btn ${selectedRpe === 10 ? 'on' : ''}" data-rpe="10"><b>@10</b><small>cedimento</small></button>
            </div>
          </div>
          <div class="set-vol mono" data-vol style="text-align:center;font-size:13px;color:var(--chalk2);margin:8px 0 16px">
            Volume serie: <b>${reps * rec.kg} kg</b>
          </div>
          <div class="btn-row">
            <button class="btn btn-ghost" data-x="undo">Annulla serie</button>
            <button class="btn btn-acc" data-x="save">Salva</button>
          </div>`,
        onMount(panel, closeSheet) {
          picker = weightPicker($('[data-wp]', panel), { kind: e.kind, value: rec.kg, bar: S().settings.bar, showBar: false });
          const out = $('[data-reps]', panel);
          const volEl = $('[data-vol]', panel);
          const updateVol = () => {
            const currentKg = picker ? picker.get() : rec.kg;
            if (volEl) volEl.innerHTML = `Volume serie: <b>${reps * currentKg} kg</b>`;
          };
          panel.addEventListener('click', (ev) => {
            const r = ev.target.closest('[data-r]');
            if (r) {
              reps = Math.max(0, Math.min(60, reps + +r.dataset.r));
              out.textContent = reps;
              punch(out, 1.1);
              updateVol();
              return;
            }
            const rpeBtn = ev.target.closest('[data-rpe]');
            if (rpeBtn) {
              selectedRpe = Number(rpeBtn.dataset.rpe);
              $$('.rpe-btn', panel).forEach((b) => b.classList.toggle('on', b === rpeBtn));
              buzz(15);
              return;
            }
            const x = ev.target.closest('[data-x]')?.dataset.x;
            if (x === 'undo') {
              undoSet(e.id, i);
            } else if (x === 'save') {
              const newKg = picker.get();
              doSet(e.id, i, { ...rec, reps, kg: newKg, rpe: selectedRpe });
              if (selectedRpe >= 10 && S().settings.autoDrop) {
                toast(`RPE 10: drop di carico suggerito per la serie ${i + 2}`, { ms: 2500 });
              }
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
      const auto = currentTargetLoad(e) ?? autoLoad(e);
      const hasOverride = S().overrides[e.id] != null;
      const prog = analyzeProgression(e);
      let picker;
      let mode = a ? 'today' : 'always';
      sheet({
        accent: sid,
        html: `
          <div class="sheet-head"><span class="mono">${esc(e.name)} · ${e.sets}×${formatRepRange(e)}</span><h2 class="sheet-title">Carico di lavoro</h2></div>
          <p class="sheet-text">${prog?.note ? esc(prog.note) : (auto != null
            ? `Calcolato: <b style="color:var(--chalk)">${kg(auto)} kg</b> (${e.oneRM ? `${Math.round(oneRmPercent(S().meso?.week, S().meso?.isDeload) * 100)}% di 1RM ${kg(rmOf(e.id))} kg` : `100% del tuo ${e.testReps} RM`}).`
            : 'Questo esercizio non ha ancora un RM: scegli il carico con cui lavorare.')}</p>
          <div data-wp></div>
          <div class="seg-mini">
            <button data-m="today" class="${mode === 'today' ? 'on' : ''}" ${a ? '' : 'disabled style="opacity:.35"'}>Solo oggi</button>
            <button data-m="always" class="${mode === 'always' ? 'on' : ''}">Da ora in poi</button>
          </div>
          <button class="btn btn-acc btn-xl" data-x="save">Usa questo carico</button>
          ${hasOverride ? '<button class="link-btn" data-x="auto">Torna al carico dell\'algoritmo</button>' : ''}`,
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
        case 'jump-partner': {
          const pid = t.dataset.partner;
          if (pid) {
            const pc = cardOf(pid);
            if (pc) open(pc);
          }
          break;
        }
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

    // Serie e chiusura arrivate dall'orologio mentre la schermata è aperta.
    const onRemote = (ev) => {
      for (const c of ev.detail) {
        if (c.type === 'finish' || c.type === 'discard') {
          const h = S().history[0];
          go(c.type === 'finish' && h ? `#/riepilogo/${h.id}` : '#/', { replace: true });
          return;
        }
        if ((c.type === 'set' || c.type === 'unset') && EX[c.ex]?.scheda === sid && cardOf(c.ex)) rerenderCard(EX[c.ex]);
      }
      if (act(sid) && $('[data-act="start"]', el)) {
        const dock = $('[data-dock]', el);
        dock.innerHTML = dockHTML(act(sid));
        bindHold();
      }
      paintProgress();
    };
    window.addEventListener('ghisa:remote', onRemote);

    return () => {
      clearInterval(tick);
      window.removeEventListener('ghisa:remote', onRemote);
    };
  },
};

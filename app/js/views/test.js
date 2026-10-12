import { setGlow } from '../anim.js';
import { KIND, schedaById } from '../data.js';
import { S, rmOf, doneIn, finishSession } from '../store.js';
import { go, back } from '../nav.js';
import { stopTimer } from '../ui/timer.js';
import { esc, kg, pad } from '../util.js';

function row(e) {
  const rm = rmOf(e.id);
  const inProgress = !!S().maxtest[e.id];
  const sub = e.oneRM
    ? `<b>1RM</b> · protocollo 9 step${inProgress ? ' · <b>in corso</b>' : ''}`
    : `<b>${e.testReps} RM</b> · ${KIND[e.kind].short}`;
  return `
    <li data-a="rise">
      <a class="row ${rm != null ? 'is-done' : ''}" href="#/${e.oneRM ? 'max' : 'rm'}/${e.id}">
        <span class="row-n mono">${pad(e.n)}</span>
        <span class="row-main"><span class="row-name">${esc(e.name)}</span><span class="row-sub mono">${sub}</span></span>
        <span class="row-val">${rm != null ? `<b class="num">${kg(rm)}</b><small>kg</small>` : '<span class="todo">Da fare</span>'}</span>
        <svg class="ico"><use href="#i-chev"/></svg>
      </a>
    </li>`;
}

export default {
  render(id) {
    const s = schedaById(id);
    const done = doneIn(id);
    const n = s.exercises.length;
    const here = S().active?.type === 'test' && S().active.scheda === id;
    return `
      <header class="bar">
        <button class="icon-btn" data-back="#/" aria-label="Indietro"><svg class="ico"><use href="#i-back"/></svg></button>
        <span class="bar-title mono">Fase test · Scheda ${id}</span><span></span>
      </header>
      <div class="head">
        <div class="head-row">
          <span class="head-letter" data-a="pop">${id}</span>
          <h1 class="h-xl" data-split>Test<br>massimali</h1>
        </div>
        <p class="lede" data-a="rise">Per ogni esercizio sali di peso finché chiudi le ripetizioni indicate. Il carico più alto riuscito è il tuo RM.</p>
        <div class="meter knurl" data-a="rise"><i data-a="bar" style="--p:${done / n}"></i></div>
        <div class="meter-label" data-a="rise"><span class="mono">${done}/${n} rilevati</span><span class="mono">${done === n ? 'Scheda completa' : `${n - done} da fare`}</span></div>
      </div>
      ${s.groups.map((g) => `
        <h3 class="group mono" data-a="rise">${esc(g.name)}</h3>
        <ol class="rows">${g.exercises.map(row).join('')}</ol>`).join('')}
      <div class="foot" data-a="rise">
        ${here ? '<button class="btn btn-ghost btn-xl" data-act="close">Chiudi sessione di test</button>' : ''}
      </div>`;
  },

  mount(el, id) {
    el.dataset.s = id;
    setGlow(id);
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-act="close"]')) {
        stopTimer();
        const hid = finishSession();
        if (hid) go(`#/riepilogo/${hid}`, { replace: true });
        else back('#/');
      }
    });
  },
};

import { gsap, setGlow, reduced, timing } from '../anim.js';
import { S, deleteHistory } from '../store.js';
import { refresh } from '../nav.js';
import { plateSVG } from '../ui/gear.js';
import { confirm } from '../ui/sheet.js';
import {
  $, $$, esc, kg, int, minutes, monthLabel, shortMonth,
} from '../util.js';

function setsLine(sets) {
  const same = sets.every((x) => x.kg === sets[0].kg);
  if (same) return `<b>${sets.map((x) => x.reps).join('·')}</b> @ ${kg(sets[0].kg)} kg`;
  return sets.map((x) => `<b>${x.reps}</b>×${kg(x.kg)}`).join(' · ');
}

function entry(x) {
  const d = new Date(x.endedAt);
  const title = x.type === 'workout' ? `Workout ${x.workout}` : `Test ${x.scheda}`;
  const sub = x.type === 'workout'
    ? `${minutes(x.endedAt - x.startedAt)} min · ${x.sets} serie · ${int(x.volume)} kg`
    : `${minutes(x.endedAt - x.startedAt)} min · ${x.found} RM · ${x.sets} tentativi`;
  const rows = x.type === 'workout'
    ? x.items.map((i) => `<li><span class="nm">${esc(i.name)}</span><span class="sx">${setsLine(i.sets)}</span></li>`).join('')
    : x.items.map((i) => `<li><span class="nm">${esc(i.name)}</span><span class="sx">${i.testReps === 1 ? '1RM' : `${i.testReps} RM`} · <b>${i.rm != null ? `${kg(i.rm)} kg` : '—'}</b></span></li>`).join('');
  return `
    <article class="entry" data-s="${x.scheda}" data-id="${x.id}" data-a="rise">
      <button class="entry-head" data-act="toggle" aria-expanded="false">
        <span class="entry-date"><b class="num">${d.getDate()}</b><span class="mono">${shortMonth(d)}</span></span>
        <span>
          <span class="entry-title">${title}<small>${x.type === 'test' ? 'Test' : `Scheda ${x.scheda}`}</small></span>
          <span class="entry-sub mono" style="display:block">${sub}</span>
        </span>
        <svg class="ico"><use href="#i-chev"/></svg>
      </button>
      <div class="entry-body"><div class="entry-inner">
        <ol class="sum-list">${rows}</ol>
        <button class="link-btn" data-act="del">Elimina sessione</button>
      </div></div>
    </article>`;
}

export default {
  render() {
    const h = S().history;
    const head = '<header class="topbar" style="margin-top:8px"><h1 class="h-l" data-split>Diario</h1></header>';
    if (!h.length) {
      return `${head}
        <div class="empty" data-s="${S().phase === 'test' ? 'A' : 'B'}">
          <div data-a="pop">${plateSVG('Ghisa · pagina bianca · Ghisa · ')}</div>
          <h2 class="h-m" data-a="rise">Pagina bianca</h2>
          <p data-a="rise">Ogni test e ogni allenamento chiuso finisce qui, con serie, carichi e volume.</p>
        </div>`;
    }
    const workouts = h.filter((x) => x.type === 'workout');
    const vol = workouts.reduce((a, x) => a + x.volume, 0);
    const week = h.filter((x) => x.endedAt > Date.now() - 7 * 864e5).length;
    const recent = workouts.slice(0, 14).reverse();
    const maxV = Math.max(...recent.map((x) => x.volume), 1);

    let month = '';
    const items = h.map((x) => {
      const m = monthLabel(x.endedAt);
      const sep = m !== month ? `<h3 class="group mono month" data-a="rise">${m}</h3>` : '';
      month = m;
      return sep + entry(x);
    }).join('');

    return `${head}
      <div class="kpis" data-a="rise">
        <div class="kpi"><span class="mono">Sessioni</span><b class="num" data-count="${h.length}">0</b></div>
        <div class="kpi"><span class="mono">Volume</span><b class="num">${vol >= 10000 ? `<span data-count="${(vol / 1000).toFixed(1)}">0</span><small>t</small>` : `<span data-count="${vol}">0</span><small>kg</small>`}</b></div>
        <div class="kpi"><span class="mono">7 giorni</span><b class="num" data-count="${week}">0</b></div>
      </div>
      ${recent.length ? `
        <div class="chart" data-a="rise">
          <div class="section-head" style="margin:0"><span class="mono">Volume per allenamento</span><span class="mono">ultimi ${recent.length}</span></div>
          <div class="chart-bars">${recent.map((x) => `<i data-s="${x.scheda}" style="height:${Math.max(3, (x.volume / maxV) * 100)}%" title="${int(x.volume)} kg"></i>`).join('')}</div>
          <div class="chart-x"><span class="mono">${shortMonth(recent[0].endedAt)} ${new Date(recent[0].endedAt).getDate()}</span><span class="mono">${shortMonth(recent.at(-1).endedAt)} ${new Date(recent.at(-1).endedAt).getDate()}</span></div>
        </div>` : ''}
      ${items}`;
  },

  mount(el) {
    setGlow('B', 0.12);
    const bars = $$('.chart-bars i', el);
    if (bars.length && !reduced) {
      gsap.from(bars, { scaleY: 0, duration: 1, ease: 'io', stagger: 0.04, delay: timing.delay + 0.25 });
    }
    const plate = $('.empty .plate', el);
    if (plate && !reduced) gsap.to(plate, { rotation: 360, duration: 40, repeat: -1, ease: 'none' });

    el.addEventListener('click', async (ev) => {
      const t = ev.target.closest('[data-act]');
      if (!t) return;
      const art = t.closest('.entry');
      if (t.dataset.act === 'toggle') {
        const open = !art.classList.contains('open');
        art.classList.toggle('open', open);
        t.setAttribute('aria-expanded', open);
        const b = $('.entry-body', art);
        if (open) {
          gsap.fromTo(b, { height: 0 }, { height: 'auto', duration: 0.55, ease: 'out' });
          gsap.from($$('.sum-list li', art), { x: 16, opacity: 0, duration: 0.45, stagger: 0.03, delay: 0.08 });
        } else {
          gsap.to(b, { height: 0, duration: 0.4, ease: 'io' });
        }
      } else if (t.dataset.act === 'del') {
        const yes = await confirm({ title: 'Eliminare la sessione?', text: 'Sparisce dal diario. I massimali restano quelli attuali.', ok: 'Elimina', danger: true, accent: art.dataset.s });
        if (!yes) return;
        deleteHistory(art.dataset.id);
        gsap.to(art, {
          height: 0, opacity: 0, x: -30, duration: 0.45, ease: 'io', onComplete: () => refresh(),
        });
      }
    });
    return () => {
      if (plate) gsap.killTweensOf(plate);
    };
  },
};

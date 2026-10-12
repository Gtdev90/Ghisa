import { gsap, setGlow, chalk, COLORS, reduced, timing } from '../anim.js';
import { schedaById } from '../data.js';
import { S, deleteHistory } from '../store.js';
import { back } from '../nav.js';
import { confirm } from '../ui/sheet.js';
import { esc, kg, dayLabel, minutes } from '../util.js';

function setsLine(sets) {
  const same = sets.every((x) => x.kg === sets[0].kg);
  if (same) return `<b>${sets.map((x) => x.reps).join('·')}</b> @ ${kg(sets[0].kg)} kg`;
  return sets.map((x) => `<b>${x.reps}</b>×${kg(x.kg)}`).join(' · ');
}

export default {
  render(id) {
    const h = S().history.find((x) => x.id === id);
    if (!h) return null;
    const s = schedaById(h.scheda);
    const dur = minutes(h.endedAt - h.startedAt);
    const head = `
      <header class="bar">
        <span></span>
        <span class="bar-title mono">${dayLabel(h.endedAt)}</span>
        <button class="icon-btn bar-right" data-back="#/" aria-label="Chiudi"><svg class="ico"><use href="#i-x"/></svg></button>
      </header>`;

    if (h.type === 'workout') {
      const prev = S().history.find((x) => x.type === 'workout' && x.scheda === h.scheda && x.endedAt < h.endedAt);
      const delta = prev?.volume ? Math.round(((h.volume - prev.volume) / prev.volume) * 100) : null;
      return `${head}
        <div class="sum-head">
          <span class="mono" data-a="rise">Workout ${h.workout} · Scheda ${h.scheda} · Fase 1</span>
          <h1 class="mega" data-split="chars">Fatto<span class="acc">.</span></h1>
        </div>
        <div class="stats" data-a="rise">
          <div><span class="mono">Durata</span><b class="num" data-count="${dur}">0</b><span class="mono">minuti</span></div>
          <div><span class="mono">Volume</span><b class="num" data-count="${h.volume}">0</b>
            <span class="mono">kg${delta != null ? ` · <span class="delta ${delta < 0 ? 'neg' : ''}">${delta >= 0 ? '+' : ''}${delta}% sulla volta scorsa</span>` : ''}</span></div>
          <div><span class="mono">Serie</span><b class="num" data-count="${h.sets}">0</b><span class="mono">su ${s.totalSets}</span></div>
          <div><span class="mono">Ripetizioni</span><b class="num" data-count="${h.reps}">0</b><span class="mono">totali</span></div>
          ${h.hr ? `<div><span class="mono">Cuore · medio</span><b class="num" data-count="${h.hr.avg}">0</b><span class="mono">bpm · max ${h.hr.max}</span></div>
          <div><span class="mono">Calorie</span><b class="num" data-count="${h.hr.kcal || 0}">0</b><span class="mono">kcal · da orologio</span></div>` : ''}
        </div>
        <ol class="sum-list">
          ${h.items.map((i) => `<li data-a="rise"><span class="nm">${esc(i.name)}</span><span class="sx">${setsLine(i.sets)}</span></li>`).join('')}
        </ol>
        <div class="foot" data-a="rise">
          <button class="btn btn-chalk btn-xl" data-back="#/">Chiudi</button>
          <button class="link-btn" data-act="del" style="align-self:center">Elimina questa sessione</button>
        </div>`;
    }

    return `${head}
      <div class="sum-head">
        <span class="mono" data-a="rise">Fase test · Scheda ${h.scheda}</span>
        <h1 class="mega" data-split="chars" style="font-size:clamp(64px,20vw,112px)">Misurato<span class="acc">.</span></h1>
      </div>
      <div class="stats" data-a="rise">
        <div><span class="mono">Durata</span><b class="num" data-count="${dur}">0</b><span class="mono">minuti</span></div>
        <div><span class="mono">RM rilevati</span><b class="num" data-count="${h.found}">0</b><span class="mono">su ${h.items.length} testati</span></div>
      </div>
      <ol class="sum-list">
        ${h.items.map((i) => `<li data-a="rise"><span class="nm">${esc(i.name)}</span><span class="sx">${i.testReps === 1 ? '1RM' : `${i.testReps} RM`} · <b>${i.rm != null ? `${kg(i.rm)} kg` : '—'}</b></span></li>`).join('')}
      </ol>
      <div class="foot" data-a="rise">
        <button class="btn btn-chalk btn-xl" data-back="#/">Chiudi</button>
        <button class="link-btn" data-act="del" style="align-self:center">Elimina questa sessione</button>
      </div>`;
  },

  mount(el, id) {
    const h = S().history.find((x) => x.id === id);
    el.dataset.s = h.scheda;
    setGlow(h.scheda, 0.3);
    const fresh = Date.now() - h.endedAt < 15000;
    if (fresh && !reduced) {
      setTimeout(() => {
        const t = el.querySelector('.mega');
        const r = t.getBoundingClientRect();
        chalk(r.left + r.width * 0.4, r.top + r.height / 2, { color: COLORS[h.scheda], n: 60, power: 1.6 });
        gsap.fromTo(t, { scale: 1 }, { keyframes: { scale: [1.05, 0.99, 1] }, duration: 0.5, transformOrigin: '0% 50%' });
      }, (timing.delay + 0.55) * 1000);
    }
    el.addEventListener('click', async (e) => {
      if (!e.target.closest('[data-act="del"]')) return;
      const yes = await confirm({ title: 'Eliminare la sessione?', text: 'Sparisce dal diario. I massimali restano quelli attuali.', ok: 'Elimina', danger: true, accent: h.scheda });
      if (!yes) return;
      deleteHistory(id);
      back('#/');
    });
  },
};

import { gsap, setGlow, reduced, scramble, chalkAt, COLORS } from '../anim.js';
import {
  ALL, EX, KIND, LETTERS, schedaById,
} from '../data.js';
import {
  S, rmOf, workLoad, doneTotal, setRM, clearRM, setOverride,
} from '../store.js';
import { weightPicker } from '../ui/gear.js';
import { sheet, confirm, toast } from '../ui/sheet.js';
import { $, $$, esc, kg, roundTo } from '../util.js';

let lastTab = null;

function tile(e) {
  const rm = rmOf(e.id);
  return `
    <button class="tile" data-s="${e.scheda}" data-act="edit" data-id="${e.id}">
      <span class="mono">${esc(e.name)} · 1RM</span>
      <div class="kgv"><b class="num" data-v="${e.id}">${kg(rm)}</b><span>kg</span></div>
      <span class="sub">${rm != null ? `Fase 1 · <b>${kg(workLoad(e))} kg</b>` : 'Protocollo da fare'}</span>
    </button>`;
}

function list(l) {
  const s = schedaById(l);
  return s.groups.map((g) => `
    <h3 class="group mono">${esc(g.name)}</h3>
    ${g.exercises.map((e) => {
      const rm = rmOf(e.id);
      const w = workLoad(e);
      const manual = S().overrides[e.id] != null;
      return `
        <button class="mrow" data-act="edit" data-id="${e.id}">
          <span class="row-main">
            <span class="row-name">${esc(e.name)}</span>
            <span class="row-sub mono"><b>${e.oneRM ? '1RM' : `${e.testReps} RM`}</b> · ${KIND[e.kind].short}</span>
          </span>
          <span class="vals">
            <span class="row-val">${rm != null ? `<b class="num">${kg(rm)}</b><small>kg</small>` : '<span class="todo">Da fare</span>'}</span>
            ${w != null ? `<div class="work">Fase 1 <b>${kg(w)}</b>${manual ? ' · manuale' : e.oneRM ? ' · 70%' : ''}</div>` : ''}
          </span>
        </button>`;
    }).join('')}`).join('');
}

export default {
  render() {
    const tab = lastTab || S().active?.scheda || 'A';
    return `
      <header class="topbar" style="margin-top:8px"><h1 class="h-l" data-split>Massimali</h1></header>
      <div class="status mono" data-a="rise"><span><b>${doneTotal()}</b>/${ALL.length} rilevati · ciclo ${S().cycle}</span></div>
      <div class="big2" data-a="rise">${tile(EX['A-squat'])}${tile(EX['C-stacco'])}</div>
      <div class="seg" role="tablist" data-a="rise" data-s="${tab}">
        <i class="seg-ind"></i>
        ${LETTERS.map((l) => `<button role="tab" data-l="${l}" aria-selected="${l === tab}" class="${l === tab ? 'on' : ''}">${l}</button>`).join('')}
      </div>
      <div data-list>${list(tab)}</div>`;
  },

  mount(el) {
    let tab = lastTab || S().active?.scheda || 'A';
    const seg = $('.seg', el);
    const ind = $('.seg-ind', seg);
    const listEl = $('[data-list]', el);
    setGlow(tab, 0.14);

    const placeInd = (animate) => {
      const b = seg.querySelector(`[data-l="${tab}"]`);
      const v = { x: b.offsetLeft - 4, width: b.offsetWidth };
      if (animate && !reduced) {
        gsap.to(ind, { ...v, duration: 0.55, ease: 'lift' });
      } else gsap.set(ind, v);
    };
    placeInd(false);

    const switchTo = (l) => {
      if (l === tab) return;
      const dir = LETTERS.indexOf(l) > LETTERS.indexOf(tab) ? 1 : -1;
      tab = l;
      lastTab = l;
      seg.dataset.s = l;
      $$('button', seg).forEach((b) => {
        b.classList.toggle('on', b.dataset.l === l);
        b.setAttribute('aria-selected', b.dataset.l === l);
      });
      placeInd(true);
      setGlow(l, 0.14);
      gsap.timeline()
        .to(listEl, { x: -24 * dir, opacity: 0, duration: 0.2, ease: 'power2.in' })
        .add(() => { listEl.innerHTML = list(l); })
        .set(listEl, { x: 0, opacity: 1 })
        .from(listEl.children, { x: 30 * dir, opacity: 0, duration: 0.5, stagger: 0.03, ease: 'out' });
    };

    const repaint = (id) => {
      listEl.innerHTML = list(tab);
      const e = EX[id];
      if (e.oneRM) {
        const t = el.querySelector(`.tile[data-id="${id}"]`);
        const tmp = document.createElement('div');
        tmp.innerHTML = tile(e);
        t.replaceWith(tmp.firstElementChild);
      }
      const row = listEl.querySelector(`.mrow[data-id="${id}"]`);
      const n = row?.querySelector('.num') || el.querySelector(`[data-v="${id}"]`);
      if (n && rmOf(id) != null) {
        scramble(n, kg(rmOf(id)), 0.6);
        chalkAt(n, { color: COLORS[e.scheda], n: 22, power: 0.8 });
      }
      $('.status b', el).textContent = doneTotal();
    };

    function edit(id) {
      const e = EX[id];
      const rm = rmOf(id);
      let picker;
      const info = (v) => {
        const w = e.oneRM ? Math.max(S().settings.bar, roundTo(v * 0.7, S().settings.round)) : v;
        return `Fase 1 · ${e.sets}×${e.reps} a <b style="color:var(--chalk)">${kg(w)} kg</b>${e.oneRM ? ' (70%)' : ''}${S().overrides[id] != null ? ` · ora usi ${kg(S().overrides[id])} kg personalizzati` : ''}`;
      };
      sheet({
        accent: e.scheda,
        html: `
          <div class="sheet-head"><span class="mono">Scheda ${e.scheda} · ${e.oneRM ? '1RM' : `${e.testReps} RM`} · ${KIND[e.kind].short}</span>
            <h2 class="sheet-title">${esc(e.name)}</h2></div>
          <div data-wp></div>
          <p class="sheet-text" data-info>${info(rm ?? KIND[e.kind].start)}</p>
          <button class="btn btn-acc btn-xl" data-x="save">${rm != null ? 'Aggiorna RM' : 'Salva RM'}</button>
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px">
            <a class="link-btn" href="#/${e.oneRM ? 'max' : 'rm'}/${id}">Rifai il test</a>
            ${S().overrides[id] != null ? '<button class="link-btn" data-x="auto">Carico calcolato</button>' : ''}
            ${rm != null ? '<button class="link-btn" data-x="clear">Azzera</button>' : ''}
          </div>`,
        onMount(panel, close) {
          picker = weightPicker($('[data-wp]', panel), {
            kind: e.kind,
            value: rm ?? (e.oneRM ? 100 : KIND[e.kind].start),
            bar: S().settings.bar,
            showBar: false,
            onChange: (v) => { $('[data-info]', panel).innerHTML = info(v); },
          });
          panel.addEventListener('click', async (ev) => {
            const x = ev.target.closest('[data-x]')?.dataset.x;
            if (x === 'save') {
              setRM(id, picker.get());
              close();
              setTimeout(() => repaint(id), 250);
              toast(`${e.name}: RM ${kg(picker.get())} kg`);
            } else if (x === 'auto') {
              setOverride(id, null);
              close();
              repaint(id);
            } else if (x === 'clear') {
              close();
              const yes = await confirm({ title: 'Azzerare l\'RM?', text: `${esc(e.name)} tornerà "da fare" nel test.`, ok: 'Azzera', danger: true, accent: e.scheda });
              if (yes) {
                clearRM(id);
                repaint(id);
              }
            }
          });
        },
        onClose: () => picker?.kill(),
      });
    }

    el.addEventListener('click', (ev) => {
      const tb = ev.target.closest('.seg button');
      if (tb) {
        switchTo(tb.dataset.l);
        return;
      }
      const ed = ev.target.closest('[data-act="edit"]');
      if (ed) edit(ed.dataset.id);
    });

    const onResize = () => placeInd(false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  },
};

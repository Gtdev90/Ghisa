import { gsap, setGlow, reduced, timing } from '../anim.js';
import {
  S, deleteHistory, statsByMuscleGroup, allNotes, saveNote, deleteNote, noteOf,
} from '../store.js';
import { SCHEDE, EX } from '../data.js';
import { refresh } from '../nav.js';
import { plateSVG } from '../ui/gear.js';
import { confirm, sheet, toast } from '../ui/sheet.js';
import {
  $, $$, esc, kg, int, minutes, monthLabel, shortMonth,
} from '../util.js';

let activeTab = 'sessions'; // 'sessions' | 'notes'

function setsLine(sets) {
  const same = sets.every((x) => x.kg === sets[0].kg && x.rpe === sets[0].rpe);
  if (same) {
    const rpeText = sets[0].rpe ? ` <small style="color:var(--chalk3)">@${sets[0].rpe}</small>` : '';
    return `<b>${sets.map((x) => x.reps).join('·')}</b> @ ${kg(sets[0].kg)} kg${rpeText}`;
  }
  return sets.map((x) => `<b>${x.reps}</b>×${kg(x.kg)}${x.rpe ? `<small style="color:var(--chalk3)">@${x.rpe}</small>` : ''}`).join(' · ');
}

function entry(x) {
  const d = new Date(x.endedAt);
  const title = x.type === 'workout' ? `Workout ${x.workout}` : `Test ${x.scheda}`;
  const rpeSub = x.avgRpe ? ` · @${x.avgRpe}` : '';
  const deloadBadge = x.isDeload ? ' <span class="mono" style="font-size:10px;color:var(--yellow);border:1px solid rgba(247,197,27,.35);padding:1px 5px;border-radius:4px">SCARICO</span>' : '';
  const sub = x.type === 'workout'
    ? `${minutes(x.endedAt - x.startedAt)} min · ${x.sets} serie · ${int(x.volume)} kg${rpeSub}${x.hr ? ` · ♥ ${x.hr.avg}` : ''}${deloadBadge}`
    : `${minutes(x.endedAt - x.startedAt)} min · ${x.found} RM · ${x.sets} tentativi`;
  const rows = x.type === 'workout'
    ? x.items.map((i) => {
      const note = noteOf(i.id);
      const noteHtml = note ? `<div class="entry-ex-note mono"><svg class="ico"><use href="#i-note"/></svg> ${esc(note)}</div>` : '';
      return `<li><div style="flex:1;min-width:0"><span class="nm">${esc(i.name)}</span>${noteHtml}</div><span class="sx">${setsLine(i.sets)}</span></li>`;
    }).join('')
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

function notesView(notes) {
  return `
    <div class="notes-view" data-a="rise">
      <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0 16px">
        <div>
          <h2 class="h-m" style="font-size:22px;margin:0">Raccolta note</h2>
          <span class="mono" style="font-size:11px;color:var(--chalk3)">Appunti personali sugli esercizi</span>
        </div>
        <button class="btn btn-acc btn-sm" data-act="new-note" style="padding:8px 14px;font-size:12.5px;display:inline-flex;align-items:center;gap:6px">
          <svg class="ico" style="width:14px;height:14px"><use href="#i-plus"/></svg> Nuova nota
        </button>
      </div>
      ${!notes.length ? `
        <div class="empty-notes" data-a="rise">
          <div class="empty-icon"><svg class="ico"><use href="#i-note"/></svg></div>
          <h2 class="h-m">Nessuna nota personale</h2>
          <p>Aggiungi promemoria su regolazioni di fori, sellini, impugnature o sensazioni. Le vedrai sempre durante gli allenamenti e qui in archivio.</p>
          <button class="btn btn-acc" data-act="new-note" style="margin-top:16px"><svg class="ico"><use href="#i-plus"/></svg> Aggiungi la prima nota</button>
        </div>
      ` : `
        <div class="diary-notes-list">
          ${notes.map((n) => `
            <article class="diary-note-card" data-s="${n.scheda || 'A'}" data-id="${n.id}">
              <div class="diary-note-head">
                <div style="flex:1;min-width:0">
                  <span class="mono" style="font-size:10px;color:var(--chalk3);text-transform:uppercase;letter-spacing:.05em">${esc(n.group)} · Scheda ${n.scheda || 'A'}</span>
                  <h3 class="diary-note-title">${esc(n.name)}</h3>
                </div>
                <div class="diary-note-actions">
                  <button class="icon-btn-sm" data-act="edit-note" data-id="${n.id}" aria-label="Modifica"><svg class="ico"><use href="#i-edit"/></svg></button>
                  <button class="icon-btn-sm danger" data-act="del-note" data-id="${n.id}" aria-label="Elimina"><svg class="ico"><use href="#i-trash"/></svg></button>
                </div>
              </div>
              <div class="diary-note-text">${esc(n.text)}</div>
              ${n.updatedAt ? `<div class="diary-note-date mono">Aggiornato il ${new Date(n.updatedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</div>` : ''}
            </article>
          `).join('')}
        </div>
      `}
    </div>`;
}

export default {
  render() {
    const h = S().history;
    const notes = allNotes();
    const head = `
      <header class="topbar" style="margin-top:8px"><h1 class="h-l" data-split>Diario</h1></header>
      <div class="seg-tabs" data-a="rise">
        <button class="seg-tab ${activeTab === 'sessions' ? 'on' : ''}" data-act="tab-sessions">Sessioni (${h.length})</button>
        <button class="seg-tab ${activeTab === 'notes' ? 'on' : ''}" data-act="tab-notes">Note esercizi (${notes.length})</button>
      </div>`;

    if (activeTab === 'notes') {
      return `${head}${notesView(notes)}`;
    }

    if (!h.length) {
      return `${head}
        <div class="empty" data-s="${S().phase === 'test' ? 'A' : 'B'}">
          <div data-a="pop">${plateSVG('GT Workout · pagina bianca · GT Workout · ')}</div>
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

    const stats = statsByMuscleGroup(7);
    const hasStats = Object.keys(stats).length > 0;

    return `${head}
      <div class="kpis" data-a="rise">
        <div class="kpi"><span class="mono">Sessioni</span><b class="num" data-count="${h.length}">0</b></div>
        <div class="kpi"><span class="mono">Volume</span><b class="num">${vol >= 10000 ? `<span data-count="${(vol / 1000).toFixed(1)}">0</span><small>t</small>` : `<span data-count="${vol}">0</span><small>kg</small>`}</b></div>
        <div class="kpi"><span class="mono">7 giorni</span><b class="num" data-count="${week}">0</b></div>
      </div>
      ${hasStats ? `
        <div class="groups-volume" data-a="rise" style="margin:16px 0;background:var(--s1);border:1px solid var(--line);border-radius:var(--r2);padding:14px 16px">
          <div class="section-head" style="margin:0 0 10px"><span class="mono">Serie per gruppo muscolare</span><span class="mono">ultimi 7 giorni</span></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(85px,1fr));gap:8px">
            ${Object.entries(stats).map(([grp, d]) => `
              <div style="background:var(--s2);padding:8px 6px;border-radius:var(--r1);text-align:center">
                <span class="mono" style="display:block;font-size:11px;color:var(--chalk3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(grp)}</span>
                <b class="num" style="font-size:18px;color:var(--chalk)">${d.sets}</b><small class="mono" style="font-size:10px;color:var(--chalk3);display:block">${int(d.volume)} kg</small>
              </div>`).join('')}
          </div>
        </div>` : ''}
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

    function openNoteDialog(exId, exName, exScheda) {
      const cur = noteOf(exId);
      sheet({
        accent: exScheda || 'B',
        html: `
          <div class="sheet-head">
            <span class="mono">${esc(exName || exId)} · Scheda ${exScheda || 'A'}</span>
            <h2 class="sheet-title">Nota personale</h2>
          </div>
          <p class="sheet-text">Appunti su regolazioni macchine, sellino, impugnatura o postura. Rimangono visibili ogni volta che esegui questo esercizio.</p>
          <div class="note-input-wrap">
            <textarea class="note-textarea" rows="4" maxlength="300" placeholder="Es. Foro 4 alla panca, sellino medio, focus su stretch...">${esc(cur)}</textarea>
          </div>
          <div class="btn-row">
            ${cur ? '<button class="btn btn-ghost" data-x="del-note">Elimina</button>' : '<button class="btn btn-ghost" data-x="cancel">Annulla</button>'}
            <button class="btn btn-acc" data-x="save-note">Salva nota</button>
          </div>`,
        onMount(panel, closeSheet) {
          const textarea = panel.querySelector('.note-textarea');
          setTimeout(() => textarea?.focus(), 250);
          panel.addEventListener('click', (ev) => {
            const x = ev.target.closest('[data-x]')?.dataset.x;
            if (!x) return;
            if (x === 'cancel') {
              closeSheet();
            } else if (x === 'del-note') {
              deleteNote(exId);
              closeSheet();
              toast('Nota eliminata');
              refresh();
            } else if (x === 'save-note') {
              const val = textarea.value;
              saveNote(exId, val);
              closeSheet();
              toast(val.trim() ? 'Nota salvata' : 'Nota eliminata');
              refresh();
            }
          });
        },
      });
    }

    function openNewNoteDialog() {
      sheet({
        accent: 'B',
        html: `
          <div class="sheet-head">
            <span class="mono">Raccolta note · Diario</span>
            <h2 class="sheet-title">Nuova nota esercizio</h2>
          </div>
          <p class="sheet-text">Seleziona un esercizio e scrivi le tue note personali (regolazioni macchine, sellino, postura).</p>
          <div class="note-input-wrap">
            <select class="note-select" data-ex-select>
              <option value="" disabled selected>— Seleziona esercizio —</option>
              ${SCHEDE.map((s) => `
                <optgroup label="Scheda ${s.id} (Workout ${s.workout})">
                  ${s.exercises.map((e) => `<option value="${e.id}">${esc(e.name)} (${esc(e.group)})</option>`).join('')}
                </optgroup>
              `).join('')}
            </select>
            <textarea class="note-textarea" rows="4" maxlength="300" placeholder="Scrivi la tua nota personale..."></textarea>
          </div>
          <div class="btn-row">
            <button class="btn btn-ghost" data-x="cancel">Annulla</button>
            <button class="btn btn-acc" data-x="save-new">Salva nota</button>
          </div>`,
        onMount(panel, closeSheet) {
          const select = panel.querySelector('[data-ex-select]');
          const textarea = panel.querySelector('.note-textarea');
          select.addEventListener('change', () => {
            const id = select.value;
            const existing = noteOf(id);
            if (existing) textarea.value = existing;
          });
          panel.addEventListener('click', (ev) => {
            const x = ev.target.closest('[data-x]')?.dataset.x;
            if (!x) return;
            if (x === 'cancel') {
              closeSheet();
            } else if (x === 'save-new') {
              const id = select.value;
              if (!id) {
                toast('Seleziona prima un esercizio');
                return;
              }
              const val = textarea.value;
              saveNote(id, val);
              closeSheet();
              toast(val.trim() ? 'Nota salvata' : 'Nota eliminata');
              refresh();
            }
          });
        },
      });
    }

    el.addEventListener('click', async (ev) => {
      const t = ev.target.closest('[data-act]');
      if (!t) return;
      const act = t.dataset.act;

      if (act === 'tab-sessions') {
        if (activeTab !== 'sessions') {
          activeTab = 'sessions';
          refresh();
        }
        return;
      }
      if (act === 'tab-notes') {
        if (activeTab !== 'notes') {
          activeTab = 'notes';
          refresh();
        }
        return;
      }
      if (act === 'new-note') {
        openNewNoteDialog();
        return;
      }
      if (act === 'edit-note') {
        const id = t.dataset.id;
        const ex = EX[id] || Object.values(EX).find((e) => e.id.endsWith(id.replace(/^[A-D]-/, '')));
        openNoteDialog(id, ex?.name || id, ex?.scheda || 'B');
        return;
      }
      if (act === 'del-note') {
        const id = t.dataset.id;
        const yes = await confirm({
          title: 'Eliminare questa nota?',
          text: 'La nota personale verrà rimossa dall\'esercizio.',
          ok: 'Elimina',
          danger: true,
        });
        if (!yes) return;
        deleteNote(id);
        toast('Nota eliminata');
        refresh();
        return;
      }

      const art = t.closest('.entry');
      if (act === 'toggle' && art) {
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
      } else if (act === 'del' && art) {
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

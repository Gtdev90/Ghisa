import { gsap, punch, flipText, systemPrefersReduced } from '../anim.js';
import {
  S, setSetting, newCycle, resetAll, exportState, importState,
} from '../store.js';
import { go, refresh } from '../nav.js';
import { confirm, toast } from '../ui/sheet.js';
import { stopTimer } from '../ui/timer.js';
import { watchSupported, watchStatus, watchSendNow } from '../watch.js';
import {
  $, $$, kg, clock, download, clamp,
} from '../util.js';

const STEPPERS = {
  bar: { min: 0, max: 25, step: 2.5, fmt: (v) => `${kg(v)} kg` },
  restMain: { min: 30, max: 420, step: 15, fmt: clock },
  restAcc: { min: 15, max: 300, step: 15, fmt: clock },
  restTest: { min: 30, max: 420, step: 15, fmt: clock },
};

const stepper = (k) => `
  <div class="stepper" data-k="${k}">
    <button data-d="-1" aria-label="Diminuisci"><svg class="ico"><use href="#i-minus"/></svg></button>
    <output>${STEPPERS[k].fmt(S().settings[k])}</output>
    <button data-d="1" aria-label="Aumenta"><svg class="ico"><use href="#i-plus"/></svg></button>
  </div>`;

const toggle = (k) => `<button class="tog" role="switch" data-tog="${k}" aria-checked="${S().settings[k]}" aria-label="${k}"><i></i></button>`;

const row = (t, d, ctl, attrs = '') => `
  <div class="set-row" ${attrs}><div><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>${ctl}</div>`;

const actionRow = (act, t, d, icon, danger = false) => `
  <button class="set-row ${danger ? 'danger' : ''}" data-act="${act}">
    <div><div class="t">${t}</div>${d ? `<div class="d">${d}</div>` : ''}</div>
    <svg class="ico" style="color:${danger ? 'var(--red)' : 'var(--chalk3)'}"><use href="#i-${icon}"/></svg>
  </button>`;

export default {
  render() {
    const st = S().settings;
    const test = S().phase === 'test';
    return `
      <header class="bar">
        <button class="icon-btn" data-back="#/" aria-label="Indietro"><svg class="ico"><use href="#i-back"/></svg></button>
        <span class="bar-title mono">Impostazioni</span><span></span>
      </header>
      <h1 class="h-l" data-split style="margin-top:10px">Regolazioni</h1>

      <section class="set-group" data-a="rise"><span class="mono">Carichi</span><div class="set-list">
        ${row('Bilanciere', 'Peso della barra: dischi per lato e riscaldamento 1RM', stepper('bar'))}
        ${row('Arrotondamento', 'Per i carichi in percentuale (70%, riscaldamento)', `<div class="opts" data-opt="round">${[0.5, 1, 1.25, 2.5].map((v) => `<button data-v="${v}" class="${st.round === v ? 'on' : ''}">${kg(v)}</button>`).join('')}</div>`)}
      </div></section>

      <section class="set-group" data-a="rise"><span class="mono">Recuperi</span><div class="set-list">
        ${row('Squat e Stacco', 'Tra le serie in Fase 1', stepper('restMain'))}
        ${row('Altri esercizi', 'Tra le serie in Fase 1', stepper('restAcc'))}
        ${row('Tentativi del test', 'Tra un tentativo RM e l\'altro', stepper('restTest'))}
      </div></section>

      <section class="set-group" data-a="rise"><span class="mono">Fine recupero e sessione</span><div class="set-list">
        ${row('Suono', 'Tre note quando il recupero finisce', toggle('sound'))}
        ${row('Vibrazione', 'Su Android: serie, tentativi, fine recupero', toggle('vibrate'))}
        ${row('Schermo sempre acceso', 'Durante test e allenamenti', toggle('wake'))}
      </div></section>

      <section class="set-group" data-a="rise"><span class="mono">Movimento</span><div class="set-list">
        ${row('Animazioni', systemPrefersReduced() ? 'Il dispositivo chiede movimento ridotto: scegli "Auto" per rispettarlo' : '"Auto" segue le impostazioni del dispositivo', `<div class="opts" data-opt="motion">${[['auto', 'Auto'], ['full', 'Piene'], ['reduced', 'Ridotte']].map(([v, l]) => `<button data-v="${v}" class="${st.motion === v ? 'on' : ''}">${l}</button>`).join('')}</div>`)}
      </div></section>

      ${watchSupported ? `<section class="set-group" data-a="rise"><span class="mono">Orologio</span><div class="set-list">
        <div class="set-row"><div><div class="t">Wear OS</div><div class="d" data-wstatus>Controllo…</div></div></div>
        ${actionRow('watchsync', 'Invia ora all\'orologio', 'Schede, carichi e sessione in corso', 'redo')}
      </div></section>` : ''}

      <section class="set-group" data-a="rise"><span class="mono">Programma · ciclo ${S().cycle}</span><div class="set-list">
        ${test ? actionRow('phase', 'Passa alla Fase 1', 'Anche se il test non è completo', 'arrow') : ''}
        ${actionRow('cycle', 'Nuovo ciclo di test', 'Archivia i massimali attuali e ripeti il test da capo', 'redo')}
      </div></section>

      <section class="set-group" data-a="rise"><span class="mono">Dati</span><div class="set-list">
        ${actionRow('export', 'Esporta backup', 'File JSON con massimali, diario e impostazioni', 'dl')}
        ${actionRow('import', 'Importa backup', 'Sostituisce i dati di questo dispositivo', 'ul')}
        ${actionRow('reset', 'Azzera tutto', 'Cancella ogni dato e riparte dal benvenuto', 'trash', true)}
      </div></section>
      <input type="file" accept="application/json,.json" data-file hidden>
      <p class="colophon mono" data-a="rise">GHISA 1.0 · i dati restano su questo dispositivo</p>`;
  },

  mount(el) {
    $$('.tog', el).forEach((t) => gsap.set($('i', t), { x: t.getAttribute('aria-checked') === 'true' ? 22 : 0 }));

    el.addEventListener('click', async (e) => {
      const stepBtn = e.target.closest('.stepper button');
      if (stepBtn) {
        const box = stepBtn.closest('.stepper');
        const k = box.dataset.k;
        const cfg = STEPPERS[k];
        const v = clamp(S().settings[k] + +stepBtn.dataset.d * cfg.step, cfg.min, cfg.max);
        setSetting(k, v);
        flipText($('output', box), cfg.fmt(v));
        return;
      }
      const opt = e.target.closest('.opts button');
      if (opt) {
        const group = opt.closest('.opts');
        const k = group.dataset.opt;
        setSetting(k, k === 'round' ? +opt.dataset.v : opt.dataset.v);
        $('button', group).forEach((b) => b.classList.toggle('on', b === opt));
        punch(opt, 1.1);
        return;
      }
      const tog = e.target.closest('.tog');
      if (tog) {
        const k = tog.dataset.tog;
        const on = !S().settings[k];
        setSetting(k, on);
        tog.setAttribute('aria-checked', on);
        gsap.to($('i', tog), { x: on ? 22 : 0, duration: 0.5, ease: 'back.out(2.4)' });
        gsap.fromTo($('i', tog), { scaleX: 1 }, { keyframes: { scaleX: [1.3, 1] }, duration: 0.4 });
        return;
      }
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'phase') go('#/fase1');
      else if (act === 'cycle') {
        const yes = await confirm({
          title: 'Nuovo ciclo di test?',
          text: 'I massimali attuali vengono archiviati (li vedrai come "ciclo precedente") e si riparte dalla fase test. Il diario resta.',
          ok: 'Inizia nuovo ciclo',
        });
        if (!yes) return;
        stopTimer();
        newCycle();
        toast('Nuovo ciclo: si torna a misurare');
        go('#/', { replace: true });
      } else if (act === 'export') {
        const d = new Date().toISOString().slice(0, 10);
        try {
          await download(`ghisa-backup-${d}.json`, exportState());
          toast('Backup esportato');
        } catch {
          // Condivisione annullata dall'utente: nessun messaggio.
        }
      } else if (act === 'watchsync') {
        await watchSendNow();
        toast('Inviato all\'orologio');
      } else if (act === 'import') {
        $('[data-file]', el).click();
      } else if (act === 'reset') {
        const yes = await confirm({ title: 'Azzerare tutto?', text: 'Massimali, diario e impostazioni verranno cancellati da questo dispositivo. Non si torna indietro.', ok: 'Azzera', danger: true });
        if (!yes) return;
        stopTimer();
        resetAll();
        go('#/benvenuto', { replace: true });
      }
    });

    if (watchSupported) {
      watchStatus().then((r) => {
        const d = $('[data-wstatus]', el);
        if (!d) return;
        if (r.connected) d.textContent = `Collegato · ${r.nodes.join(', ')}`;
        else if (r.unavailable) d.textContent = 'Wear OS non disponibile: accoppia l\'orologio con l\'app Wear OS';
        else d.textContent = 'Nessun orologio collegato';
      });
    }

    $('[data-file]', el).addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        const yes = await confirm({ title: 'Importare il backup?', text: `I dati attuali saranno sostituiti da <b>${f.name}</b>.`, ok: 'Importa' });
        if (!yes) return;
        stopTimer();
        importState(obj);
        toast('Backup importato');
        refresh();
      } catch {
        toast('File non valido: serve un backup di GHISA');
      }
    });
  },
};

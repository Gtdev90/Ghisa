// Navigazione a hash con History API: le pagine e i pannelli (sheet, timer) hanno ciascuno
// una voce di cronologia, così il tasto "indietro" di Android chiude prima il pannello.
const layers = [];
let ignorePops = 0;
let queued = null;
let onRoute = () => {};

export function initNav(route) {
  onRoute = route;
  if (history.state?.i == null) history.replaceState({ i: 0 }, '');
  window.addEventListener('popstate', () => {
    if (ignorePops > 0) {
      ignorePops -= 1;
      if (!ignorePops && queued) {
        const q = queued;
        queued = null;
        q();
      }
      return;
    }
    if (layers.length) {
      layers.pop().close();
      return;
    }
    onRoute();
  });
}

export function go(hash, { replace = false } = {}) {
  if (ignorePops > 0) {
    queued = () => go(hash, { replace });
    return;
  }
  const i = history.state?.i || 0;
  if (layers.length) {
    // La voce corrente è quella del pannello: la riuso per la nuova pagina.
    layers.splice(0).forEach((l) => l.close());
    history.replaceState({ i: i + 1 }, '', hash);
  } else if (replace) {
    history.replaceState({ i }, '', hash);
  } else {
    history.pushState({ i: i + 1 }, '', hash);
  }
  onRoute();
}

export function back(fallback = '#/') {
  if ((history.state?.i || 0) > 0 && !layers.length) history.back();
  else go(fallback, { replace: true });
}

/** Registra un pannello. `close` viene chiamata se l'utente preme "indietro".
 *  Ritorna `release`, da chiamare quando il pannello si chiude dalla UI. */
export function pushLayer(close) {
  const layer = { close };
  layers.push(layer);
  history.pushState({ ...history.state, layer: true }, '');
  return function release() {
    const k = layers.indexOf(layer);
    if (k < 0) return;
    layers.splice(k, 1);
    ignorePops += 1;
    history.back();
  };
}

export const currentPath = () => location.hash.replace(/^#/, '') || '/';

/** Ridisegna la vista corrente (dopo import, reset, eliminazioni). */
export const refresh = () => onRoute(true);

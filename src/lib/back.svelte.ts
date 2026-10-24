// Android Back in the installed app.
// 1. Open layers (the menu, the image sheet) get their own history entry, so Back closes them instead of
//    leaving the screen behind them.
// 2. At the start of the app's history, Back would close the app. A guard entry catches the first press and
//    shows "Press back again to exit"; a second press within EXIT_WINDOW lets the app close.
// Browser tabs keep normal Back behaviour for 2: leaving a site with Back is expected there.

const EXIT_WINDOW = 2000;
const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

type State = { depth?: number; guard?: boolean; layer?: string } | null;
const state = () => history.state as State;

export const backToast = $state({ visible: false });

/** Layers currently open, innermost last, each with its close function. */
const layers: { id: string; close: () => void }[] = [];

/** Call when a layer opens. Back (or closeLayer) will close it. */
export function openLayer(id: string, close: () => void): void {
  layers.push({ id, close });
  history.pushState({ ...state(), layer: id }, '', location.href);
}

/** Call when a layer closes from its own UI (close button, Esc, scrim), to drop its history entry. */
export function closeLayer(id: string): void {
  const k = layers.findIndex((l) => l.id === id);
  if (k < 0) return;
  layers.splice(k, 1);
  if (state()?.layer === id) history.back();
}

let exitTimer: ReturnType<typeof setTimeout> | undefined;

function armGuard(): void {
  if (!standalone) return;
  history.replaceState({ ...state(), guard: false }, '', location.href);
  history.pushState({ ...state(), guard: true, depth: 0 }, '', location.href);
}

addEventListener('popstate', () => {
  // A layer's entry was popped: close the layer (its own close handler must not go back again).
  const top = layers[layers.length - 1];
  if (top && state()?.layer !== top.id) {
    layers.pop();
    top.close();
    return;
  }
  // Popped the guard: we're on the app's first entry. Warn, and re-arm unless Back comes again soon.
  if (standalone && state()?.guard === false) {
    backToast.visible = true;
    clearTimeout(exitTimer);
    exitTimer = setTimeout(() => {
      backToast.visible = false;
      if (state()?.guard === false) history.pushState({ ...state(), guard: true, depth: 0 }, '', location.href);
    }, EXIT_WINDOW);
  }
});

// Only on a fresh start at depth 0 (a reload deeper in the app keeps its own entries).
if ((state()?.depth ?? 0) === 0 && state()?.guard === undefined) armGuard();

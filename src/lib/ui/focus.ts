// Keyboard behaviour for dialogs, radio groups and trees, as Svelte actions.

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside a dialog or drawer while it's open, and puts focus back where it was when it closes. */
export function trapFocus(node: HTMLElement) {
  const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const onkey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
    if (!items.length) return;
    const first = items[0]!;
    const last = items.at(-1)!;
    const inside = node.contains(document.activeElement);
    if (e.shiftKey && (!inside || document.activeElement === first)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', onkey);
  return {
    destroy() {
      document.removeEventListener('keydown', onkey);
      if (before?.isConnected) before.focus({ preventScroll: true });
    },
  };
}

/**
 * A role="radiogroup" as the ARIA pattern has it: Tab stops once, on the chosen option, and the arrow
 * keys (and Home, End) move to another option and choose it.
 */
export function radiogroup(node: HTMLElement) {
  const radios = () => [...node.querySelectorAll<HTMLElement>('[role=radio]')];
  const rove = () => {
    const all = radios();
    const on = all.find((r) => r.getAttribute('aria-checked') === 'true') ?? all[0];
    for (const r of all) r.tabIndex = r === on ? 0 : -1;
  };
  const onkey = (e: KeyboardEvent) => {
    const all = radios().filter((r) => !(r as HTMLButtonElement).disabled);
    const at = all.indexOf(document.activeElement as HTMLElement);
    const step: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (at < 0 || !(e.key in step || e.key === 'Home' || e.key === 'End')) return;
    e.preventDefault();
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (at + step[e.key]! + all.length) % all.length;
    all[to]!.focus();
    all[to]!.click();
  };
  rove();
  const watch = new MutationObserver(rove);
  watch.observe(node, { subtree: true, childList: true, attributeFilter: ['aria-checked'] });
  node.addEventListener('keydown', onkey);
  return {
    destroy() {
      watch.disconnect();
      node.removeEventListener('keydown', onkey);
    },
  };
}

/**
 * The topic tree's keys: ↑ ↓ move between the rows shown, → opens a row (or moves into it when open),
 * ← closes it (or moves to its parent), Home and End go to the first and last row. Rows are `.row`
 * elements holding a link and, for rows with children, a toggle with aria-expanded.
 */
export function treeKeys(node: HTMLElement) {
  const linkOf = (row: Element | null | undefined) => row?.querySelector<HTMLElement>('a');
  const onkey = (e: KeyboardEvent) => {
    const row = (e.target as HTMLElement).closest('.row');
    if (!row || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const rows = [...node.querySelectorAll('.row')];
    const at = rows.indexOf(row);
    const toggle = row.querySelector<HTMLElement>('[aria-expanded]');
    const open = toggle?.getAttribute('aria-expanded') === 'true';
    let to: Element | null | undefined;
    if (e.key === 'ArrowDown') to = rows[at + 1];
    else if (e.key === 'ArrowUp') to = rows[at - 1];
    else if (e.key === 'Home') to = rows[0];
    else if (e.key === 'End') to = rows.at(-1);
    else if (e.key === 'ArrowRight') {
      if (toggle && !open) toggle.click();
      else if (open) to = rows[at + 1];
      to ??= row;
    } else if (e.key === 'ArrowLeft') {
      if (open) toggle!.click();
      else to = row.parentElement?.parentElement?.closest('li')?.querySelector(':scope > .row');
      to ??= row;
    } else return;
    e.preventDefault();
    linkOf(to)?.focus();
  };
  node.addEventListener('keydown', onkey);
  return { destroy: () => node.removeEventListener('keydown', onkey) };
}

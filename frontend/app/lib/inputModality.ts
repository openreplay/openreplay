// `<html data-modality>`: 'keyboard' after Tab (or arrow keys outside a text
// field), 'pointer' after any pointer press. Field focus rings follow it.
const NAV_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

function isTextEntry(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  return ![
    'checkbox',
    'radio',
    'range',
    'button',
    'submit',
    'reset',
    'color',
    'file',
  ].includes((el as HTMLInputElement).type);
}

export function installInputModality(
  root: HTMLElement = document.documentElement,
) {
  const set = (m: 'keyboard' | 'pointer') => {
    if (root.dataset.modality !== m) root.dataset.modality = m;
  };
  set('pointer');
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Tab' || (NAV_KEYS.has(e.key) && !isTextEntry(e.target)))
        set('keyboard');
    },
    true,
  );
  document.addEventListener('pointerdown', () => set('pointer'), true);
}

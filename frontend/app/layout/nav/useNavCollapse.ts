import { useCallback, useEffect, useState } from 'react';

import { useStore } from 'App/mstore';
import { ownsKeys } from 'App/utils/keys';

const NARROW = '(max-width: 1079px)';

export const COLLAPSE_KEY =
  typeof navigator !== 'undefined' &&
  /Mac|iP(hone|ad|od)/.test(navigator.userAgent)
    ? '⌘\\'
    : 'Ctrl+\\';

/**
 * Narrow viewports collapse on the crossing; a replay route collapses for as
 * long as it is open and the stored choice comes back after it.
 */
/** `enabled` is false where no nav is drawn (bare routes): the shortcut stays inert there. */
export function useNavCollapse(immersive: boolean, enabled = true) {
  const { settingsStore } = useStore();
  const [immersiveOpen, setImmersiveOpen] = useState(false);

  useEffect(() => setImmersiveOpen(false), [immersive]);

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    if (mq.matches && !settingsStore.menuCollapsed) {
      settingsStore.updateMenuCollapsed(true);
    }
    const onCross = (e: MediaQueryListEvent) =>
      settingsStore.updateMenuCollapsed(e.matches);
    mq.addEventListener('change', onCross);
    return () => mq.removeEventListener('change', onCross);
  }, []);

  const toggle = useCallback(() => {
    if (immersive) setImmersiveOpen((o) => !o);
    else settingsStore.updateMenuCollapsed(!settingsStore.menuCollapsed);
  }, [immersive]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '\\' || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (!enabled || ownsKeys(e.target)) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, enabled]);

  const collapsed = immersive ? !immersiveOpen : settingsStore.menuCollapsed;
  return { collapsed, toggle };
}

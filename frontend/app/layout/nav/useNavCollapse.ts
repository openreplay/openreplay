import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import { useStore } from 'App/mstore';
import { ownsKeys } from 'App/utils/keys';

const NARROW = '(max-width: 1079px)';
const PHONE = '(max-width: 639px)';

export const COLLAPSE_KEY =
  typeof navigator !== 'undefined' &&
  /Mac|iP(hone|ad|od)/.test(navigator.userAgent)
    ? '⌘\\'
    : 'Ctrl+\\';

/**
 * Narrow viewports collapse on the crossing; a replay, or a page that wants
 * the room (`room`), holds the menu collapsed for as long as it is open and
 * the stored choice comes back after it. `enabled` is false where no nav is
 * drawn (bare routes): the shortcut stays inert there.
 */
export function useNavCollapse(
  { replay, room }: { replay: boolean; room: boolean },
  enabled = true,
) {
  const { settingsStore } = useStore();
  const immersive = replay || room;
  const [immersiveOpen, setImmersiveOpen] = useState(false);
  const isHeld = immersive && !immersiveOpen;
  const held = useRef(isHeld);
  useLayoutEffect(() => {
    held.current = isHeld;
  }, [isHeld]);

  useEffect(() => setImmersiveOpen(false), [immersive]);

  // a page that wants the room takes the menu's width in the same frame, both
  // ways, instead of animating it under a page already drawn; a replay and
  // your own toggle still animate
  const wasRoom = useRef(room);
  useLayoutEffect(() => {
    if (wasRoom.current === room) return;
    wasRoom.current = room;
    if (replay) return;
    const root = document.documentElement;
    root.setAttribute('data-nav-instant', '');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => root.removeAttribute('data-nav-instant')),
    );
  }, [room, replay]);

  // used while held collapsed, it stays collapsed after: picking the next page
  // from the rail does not spring the menu open under the pointer
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!held.current || window.matchMedia(PHONE).matches) return;
      const t = e.target;
      if (t instanceof Element && t.closest('.m-nav, .m-flyout-root'))
        settingsStore.updateMenuCollapsed(true);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

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

  // a toggle by hand is the last word: nothing restores over it
  const toggle = useCallback(() => {
    if (immersive) {
      settingsStore.updateMenuCollapsed(!isHeld);
      setImmersiveOpen(isHeld);
    } else settingsStore.updateMenuCollapsed(!settingsStore.menuCollapsed);
  }, [immersive, isHeld]);

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

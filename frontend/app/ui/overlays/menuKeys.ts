import type { KeyboardEvent } from 'react';

const ITEM = '[role^="menuitem"]:not([disabled]):not([aria-disabled="true"])';

/**
 * Arrow-key focus for the hand-rolled `role="menu"` popovers (they hold a
 * search field, so Radix's menu doesn't fit). Acts only from an item or the
 * search field, so other controls inside (date inputs, the calendar grid)
 * keep their own keys. Down from the search field enters the list.
 */
export function menuKeyDown(e: KeyboardEvent<HTMLElement>) {
  const { key } = e;
  if (
    key !== 'ArrowDown' &&
    key !== 'ArrowUp' &&
    key !== 'Home' &&
    key !== 'End'
  )
    return;
  if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.defaultPrevented || e.nativeEvent.isComposing) return;
  const target = e.target as HTMLElement;
  // keys bubble through portals: a nested menu's items aren't ours
  if (!e.currentTarget.contains(target)) return;
  const fromSearch = target.closest('.m-psearch') != null;
  if (fromSearch ? key !== 'ArrowDown' : !target.matches(ITEM)) return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(ITEM));
  if (!items.length) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const last = items.length - 1;
  const next =
    key === 'Home'
      ? 0
      : key === 'End'
        ? last
        : key === 'ArrowDown'
          ? at < 0 || at === last
            ? 0
            : at + 1
          : at <= 0
            ? last
            : at - 1;
  e.preventDefault();
  items[next].focus();
}

import {
  type MutableRefObject,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { PickerBody } from './FilterPicker';
import './filter-panel.css';
import type { CatalogueEntry } from './types';

export interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  onPick: (entry: CatalogueEntry) => void;
  entries: readonly CatalogueEntry[];
  taken?: readonly string[];
  seed?: string;
  query?: string;
  onQueryChange?: (q: string) => void;
  hideSearch?: boolean;
  commitRef?: MutableRefObject<(() => void) | null>;
  anchorRef?: RefObject<HTMLElement | null>;
  placeholder?: string;
  kind?: 'all' | 'event' | 'group';
}

/** The catalogue panel, portalled so no column or drawer clips it. */
export function FilterPanel({
  open,
  onClose,
  onPick,
  entries,
  taken = [],
  seed,
  query,
  onQueryChange,
  hideSearch,
  commitRef,
  anchorRef,
  placeholder,
  kind = 'all',
}: FilterPanelProps) {
  const { t } = useTranslation();
  const oneKind = kind !== 'all';
  const box = useRef<HTMLDivElement>(null);
  const portal = !!anchorRef;
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const [host, setHost] = useState<HTMLElement | null>(null);

  const panelW = (doorW: number) =>
    oneKind ? 432 : Math.max(432, Math.round(doorW));

  useLayoutEffect(() => {
    if (!open || !portal) return undefined;
    const a0 = anchorRef.current;
    const container =
      (a0?.closest(
        '[data-slot="drawer"], [role="dialog"]',
      ) as HTMLElement | null) ?? document.body;
    setHost(container);
    const place = () => {
      const a = anchorRef.current;
      if (!a) return;
      const r = a.getBoundingClientRect();
      const gap = 8;
      const W = panelW(r.width);
      const H = oneKind ? 384 : 480;
      const m = 16;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = r.left;
      if (left + W > vw - m) left = Math.max(m, Math.min(r.right, vw - m) - W);
      let top = r.bottom + gap;
      if (top + H > vh - m)
        top = r.top - gap - H >= m ? r.top - gap - H : Math.max(m, vh - m - H);
      if (container !== document.body) {
        const c = container.getBoundingClientRect();
        left = left - c.left + container.scrollLeft;
        top = top - c.top + container.scrollTop;
      }
      setAt({ top: Math.round(top), left: Math.round(left) });
    };
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, portal, anchorRef, oneKind]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef?.current ?? box.current?.parentElement;
    if (anchor && box.current)
      box.current.style.setProperty(
        '--m-fpanel-w',
        `${panelW(anchor.getBoundingClientRect().width)}px`,
      );
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: PointerEvent) => {
      const anchor = anchorRef?.current ?? box.current?.parentElement;
      const target = e.target as Node | null;
      if (!anchor || !target) return;
      if (anchor.contains(target)) return;
      if (box.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('[data-radix-popper-content-wrapper]')
      )
        return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const inContainer = host && host !== document.body;
  const node = (
    <div
      ref={box}
      className={`m-fpanel is-still is-grown${oneKind ? ' is-one-kind' : ''}${portal ? (inContainer ? ' is-portal is-portal-in' : ' is-portal') : ''}`}
      style={portal && at ? { top: at.top, left: at.left } : undefined}
      role="dialog"
      aria-label={t('Add to the filter')}
      data-slot="filter-panel"
    >
      <PickerBody
        entries={entries}
        taken={taken}
        onPick={onPick}
        onDone={onClose}
        seed={seed}
        query={query}
        onQueryChange={onQueryChange}
        hideSearch={hideSearch}
        commitRef={commitRef}
        placeholder={placeholder ?? t('Search events and group filters')}
      />
    </div>
  );
  return portal ? createPortal(node, host ?? document.body) : node;
}

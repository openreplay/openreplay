import { CountSuffix } from '@/ui/data/CountSuffix';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { useViewport } from '@/ui/layout/use-viewport';
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  PhoneFilters,
  SheetSection,
  useInFilterSheet,
  useSheetCount,
} from './PhoneFilters';
import './filter-strip.css';

export interface StripItem {
  key: string;
  label: string;

  count?: number;
  icon?: ReactNode;
}

export interface FilterStripProps {
  items: readonly StripItem[];

  selected: readonly string[];
  onSelect: (key: string) => void;

  label: string;
  /** at phone: `menu` when the page's Filters or Display menu draws the
      choices, else the strip is its own Filters drawer */
  folds?: 'menu';
}

export const stripActive = ({
  items,
  selected,
}: Pick<FilterStripProps, 'items' | 'selected'>) =>
  selected.some((k) => k !== 'all' && items.some((i) => i.key === k));

/** The strip as option rows: a drawer's "Show", or a folded menu's. */
export function StripChoices({
  items,
  selected,
  onSelect,
  label,
}: FilterStripProps) {
  const single = selected.length <= 1;
  const marked = items.some((it) => it.icon);
  return (
    <div className="m-seg-list" role="group" aria-label={label}>
      {items.map((it) => (
        <CheckRow
          key={it.key}
          single={single}
          on={selected.includes(it.key)}
          icon={
            it.icon ??
            (marked ? (
              <span className="m-seg-list__blank" aria-hidden="true" />
            ) : undefined)
          }
          meta={it.count != null ? <CountSuffix n={it.count} /> : undefined}
          onToggle={() => onSelect(it.key)}
        >
          {it.label}
        </CheckRow>
      ))}
    </div>
  );
}

export function FilterStrip(props: FilterStripProps) {
  const { t } = useTranslation();
  const phone = useViewport() === 'phone';
  const inSheet = useInFilterSheet();
  useSheetCount(
    inSheet && props.folds !== 'menu' && stripActive(props) ? 1 : 0,
  );
  if (inSheet)
    return props.folds === 'menu' ? null : (
      <SheetSection title={t('Show')} first>
        <StripChoices {...props} />
      </SheetSection>
    );
  if (phone)
    return props.folds === 'menu' ? null : (
      <PhoneFilters>
        <FilterStrip {...props} />
      </PhoneFilters>
    );
  return <StripLine {...props} />;
}

function StripLine({ items, selected, onSelect, label }: FilterStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const [live, setLive] = useState(false);

  const one = selected.length === 1 ? selected[0] : null;
  // callers pass inline arrays: re-measure when the buttons change, not per render
  const shape = items
    .map((i) => `${i.key}:${i.label}:${i.count ?? ''}`)
    .join('|');

  const measureRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const strip = ref.current;
    if (!strip || one == null) {
      measureRef.current = () => {};
      setThumb(null);
      setLive(false);
      return undefined;
    }
    const measure = () => {
      const el = strip.querySelector<HTMLElement>(
        `[data-key="${CSS.escape(one)}"]`,
      );
      if (!el) return setThumb(null);
      const next = {
        x: el.offsetLeft,
        y: el.offsetTop,
        w: el.offsetWidth,
        h: el.offsetHeight,
      };
      setThumb((prev) =>
        prev &&
        prev.x === next.x &&
        prev.y === next.y &&
        prev.w === next.w &&
        prev.h === next.h
          ? prev
          : next,
      );
    };
    measureRef.current = measure;
    measure();
    const id = requestAnimationFrame(() => setLive(true));
    return () => cancelAnimationFrame(id);
  }, [one, shape]);

  // a resize (the strip wrapping, a web font swapping in) re-places the thumb
  // without sliding it; set up per button set, not per selection, so a click
  // keeps its slide. The first callback is just the initial observation.
  useEffect(() => {
    const strip = ref.current;
    if (!strip) return undefined;
    let primed = false;
    const ro = new ResizeObserver(() => {
      if (!primed) {
        primed = true;
        return;
      }
      setLive(false);
      measureRef.current();
      requestAnimationFrame(() => setLive(true));
    });
    ro.observe(strip);
    strip.querySelectorAll('[data-key]').forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [shape]);

  return (
    <div className="m-seg" role="group" aria-label={label} ref={ref}>
      {thumb && (
        <span
          className={`m-seg__thumb m-travel${live ? ' is-live' : ''}`}
          aria-hidden="true"
          style={{
            transform: `translate(${thumb.x}px, ${thumb.y}px)`,
            width: thumb.w,
            height: thumb.h,
          }}
        />
      )}
      {items.map((it) => {
        const on = selected.includes(it.key);
        return (
          <button
            key={it.key}
            type="button"
            data-key={it.key}
            aria-pressed={on}
            className={`m-seg__item${on ? ' is-on' : ''}${thumb ? ' has-thumb' : ''}`}
            onClick={() => onSelect(it.key)}
          >
            {it.icon}
            {it.label}
            {it.count != null && <CountSuffix n={it.count} />}
          </button>
        );
      })}
    </div>
  );
}

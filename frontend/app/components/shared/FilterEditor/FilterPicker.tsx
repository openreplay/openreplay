import { CaptureIcon, captureKind } from '@/ui/icons/CaptureIcon';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import {
  ALargeSmall,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CornerDownLeft,
  Flag,
  Globe,
  Hash,
  List,
  ListTree,
  Search,
  Split,
  Tags,
  Timer,
  ToggleLeft,
  User,
} from 'lucide-react';
import {
  Fragment,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { categoryLabel, groupCatalogue, searchCatalogue } from './catalogue';
import './filter-picker.css';
import type { CatalogueEntry } from './types';

const ROW_PAGE = 150;

export function entryIcon(e: CatalogueEntry, size = 13): ReactNode {
  if (e.category === 'segments') return <Split size={size} />;
  if (e.category === 'features') return <Flag size={size} />;
  if (e.isEvent)
    return (
      <CaptureIcon
        kind={captureKind(e.name, e.autoCaptured, true)}
        size={size}
      />
    );
  switch (e.dataType) {
    case 'number':
      return <Hash size={size} />;
    case 'boolean':
      return <ToggleLeft size={size} />;
    case 'duration':
      return <Timer size={size} />;
    case 'array':
      return <List size={size} />;
    case 'date':
      return <CalendarDays size={size} />;
    default:
      return <ALargeSmall size={size} />;
  }
}

const CATEGORY_ICON: Record<string, ReactNode> = {
  auto_captured: <CaptureIcon kind="auto" />,
  user_events: <CaptureIcon kind="custom" />,
  features: <Flag size={13} />,
  segments: <Split size={13} />,
  user: <User size={13} />,
  users: <User size={13} />,
  session: <Clock size={13} />,
  event: <ListTree size={13} />,
  technology: <Globe size={13} />,
  metadata: <Tags size={13} />,
};

const categoryIcon = (key: string) => CATEGORY_ICON[key] ?? <List size={13} />;

const ALL = '__all';

/** Typed text as a search of its own, offered first unless it names an entry. */
export interface FreeTextOffer {
  label: string;
  onPick: (text: string) => void;
  /** why the text can't be taken, said in place of the offer */
  blocked?: (text: string) => string | null;
}

export interface FilterPickerProps {
  entries: readonly CatalogueEntry[];
  taken?: readonly string[];
  onPick: (entry: CatalogueEntry) => void;
  initialCategory?: string;
  placeholder?: string;
  note?: string;
  seed?: string;
  loading?: boolean;
  children: ReactElement;
}

export interface PickerBodyProps extends Omit<FilterPickerProps, 'children'> {
  onDone?: () => void;
  onBack?: () => void;
  backLabel?: string;
  query?: string;
  onQueryChange?: (q: string) => void;
  hideSearch?: boolean;
  commitRef?: MutableRefObject<(() => void) | null>;
  freeText?: FreeTextOffer;
}

export function PickerBody({
  entries,
  taken = [],
  onPick,
  initialCategory,
  placeholder,
  note,
  seed,
  loading,
  onDone,
  onBack,
  backLabel,
  query: controlledQuery,
  onQueryChange,
  hideSearch = false,
  commitRef,
  freeText,
}: PickerBodyProps) {
  const { t } = useTranslation();
  const [ownQuery, setOwnQuery] = useState(seed ?? '');
  const query = controlledQuery ?? ownQuery;
  const setQuery = onQueryChange ?? setOwnQuery;
  const [cat, setCat] = useState<string>(initialCategory ?? ALL);

  const groups = useMemo(() => groupCatalogue(entries), [entries]);
  const matches = useMemo(
    () => searchCatalogue(query, entries),
    [query, entries],
  );
  const q = query.trim();
  const freeQ = freeText ? q : '';
  const isExact = (e: CatalogueEntry) =>
    e.displayName.toLowerCase() === freeQ.toLowerCase();
  const exact = !!freeQ && matches.some(isExact);
  const shown = useMemo(
    () =>
      q
        ? exact
          ? [...matches.filter(isExact), ...matches.filter((e) => !isExact(e))]
          : matches
        : cat === ALL
          ? [...entries]
          : entries.filter((e) => e.category === cat),
    [q, matches, cat, entries, exact],
  );
  const freeBlocked = freeQ ? (freeText?.blocked?.(freeQ) ?? null) : null;
  const freeFirst = !!freeQ && !exact;

  // a project's catalogue can run to thousands of entries: draw a page of them
  // the page size belongs to a (query, category): derived, so a new question
  // never renders one frame at the previous size
  const listKey = `${q}\u0000${cat}`;
  const [pager, setPager] = useState({ key: listKey, limit: ROW_PAGE });
  const limit = pager.key === listKey ? pager.limit : ROW_PAGE;
  const setLimit = (next: (n: number) => number) =>
    setPager({ key: listKey, limit: next(limit) });
  const takenIds = useMemo(() => new Set(taken), [taken]);
  const matchCounts = useMemo(() => {
    const out = new Map<string, number>();
    for (const e of matches)
      out.set(e.category, (out.get(e.category) ?? 0) + 1);
    return out;
  }, [matches]);

  const railBox = useRef<HTMLDivElement>(null);
  const aimTimer = useRef<number | null>(null);
  const last = useRef<{ x: number; y: number; t: number } | null>(null);
  const cancelAim = useCallback(() => {
    if (aimTimer.current) window.clearTimeout(aimTimer.current);
    aimTimer.current = null;
  }, []);
  useEffect(() => cancelAim, [cancelAim]);
  const trackAim = (e: ReactPointerEvent<HTMLDivElement>) => {
    last.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  // A pointer travelling right toward the list keeps the current category.
  const headingForPane = (e: ReactPointerEvent<HTMLElement>): boolean => {
    const prev = last.current;
    const rail = railBox.current?.getBoundingClientRect();
    if (!prev || !rail) return false;
    if (performance.now() - prev.t > 300) return false;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (dx <= 0) return false;
    const slopeTop = (rail.top - prev.y) / Math.max(1, rail.right - prev.x);
    const slopeBottom =
      (rail.bottom - prev.y) / Math.max(1, rail.right - prev.x);
    const slope = dy / dx;
    return slope >= slopeTop && slope <= slopeBottom;
  };
  const aimAt = (key: string, e: ReactPointerEvent<HTMLElement>) => {
    // a finger passing over a chip is a swipe, not an aim: touch changes on tap
    if (e.pointerType !== 'mouse') return;
    if (q) return;
    cancelAim();
    if (key === cat) return;
    const wait = headingForPane(e) ? 320 : 70;
    aimTimer.current = window.setTimeout(() => setCat(key), wait);
  };

  const close = () => {
    setQuery('');
    setCat(initialCategory ?? ALL);
    onDone?.();
  };
  const pick = (e: CatalogueEntry) => {
    onPick(e);
    close();
  };
  const takeFree = () => {
    if (!freeText || !freeQ || freeBlocked) return;
    freeText.onPick(freeQ);
    close();
  };
  const commit = () => {
    if (freeFirst) takeFree();
    else if (shown.length) pick(shown[0]);
  };
  useEffect(() => {
    if (!commitRef) return undefined;
    commitRef.current = commit;
    return () => {
      commitRef.current = null;
    };
  });

  const railRows = [
    { key: ALL, label: t('All'), n: entries.length, kind: undefined },
    ...groups.map((g) => ({
      key: g.key,
      label: t(g.label),
      n: q ? (matchCounts.get(g.key) ?? 0) : g.entries.length,
      kind: g.entries[0]?.isEvent ?? false,
    })),
  ];
  const bothKinds =
    groups.some((g) => g.entries[0]?.isEvent) &&
    groups.some((g) => g.entries[0] && !g.entries[0].isEvent);

  // One property can come under several events with the same id, so the parent
  // event name joins the key; a repeat that still collides gets a counter.
  const rowKeys = useMemo(() => {
    const seen = new Map<string, number>();
    return shown.map((e) => {
      const base = `${e.category}:${e.source.eventName ?? ''}:${e.id}`;
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      return n ? `${base}#${n}` : base;
    });
  }, [shown]);

  const row = (e: CatalogueEntry, i: number) => {
    const dead = !e.isEvent && takenIds.has(e.id);
    return (
      <button
        key={rowKeys[i]}
        type="button"
        role="menuitem"
        disabled={dead}
        className={`m-pick2__row${dead ? ' is-taken' : ''}`}
        onClick={() => pick(e)}
      >
        <span className="m-pick2__glyph" aria-hidden="true">
          {entryIcon(e)}
        </span>
        <span className="m-pick2__name m-truncate">{e.displayName}</span>
        {(q || cat === ALL) && (
          <span className="m-pick2__tag">{t(categoryLabel(e.category))}</span>
        )}
        {dead && <span className="m-pick2__tag">{t('added')}</span>}
      </button>
    );
  };

  const lit = freeFirst && !freeBlocked;
  const freeRow = freeQ ? (
    <button
      type="button"
      role="menuitem"
      disabled={!!freeBlocked}
      className={`m-pick2__row m-pick2__free${lit ? ' is-cursor' : ''}`}
      onClick={takeFree}
    >
      <span className="m-pick2__glyph" aria-hidden="true">
        <Search size={13} />
      </span>
      <span className="m-pick2__name m-truncate">
        {freeBlocked ?? (
          <>
            {freeText!.label}{' '}
            <span className="m-pick2__free-q">
              {freeQ.includes('"') ? freeQ : `“${freeQ}”`}
            </span>
          </>
        )}
      </span>
      {lit && (
        <span className="m-pick2__enter" aria-hidden="true">
          <CornerDownLeft size={11} />
        </span>
      )}
    </button>
  ) : null;

  return (
    <div className="m-pick2 m-pick2--panes" role="menu" onKeyDown={menuKeyDown}>
      {!hideSearch && (
        <PopoverSearch
          className="m-pick2__search"
          placeholder={placeholder ?? t('Search')}
          label={t('Events and properties')}
          value={query}
          onChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === 'Escape') return close();
            if (e.key === 'Enter') commit();
          }}
          lead={
            onBack ? (
              <button
                type="button"
                className="m-pick__back"
                onClick={onBack}
                aria-label={
                  backLabel
                    ? t('Back to {{label}}', { label: backLabel })
                    : t('Back')
                }
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
            ) : (
              <span className="m-pick__search-glyph" aria-hidden="true">
                <Search size={13} />
              </span>
            )
          }
        />
      )}
      {note && <p className="m-pick__note">{note}</p>}
      <div className="m-pick2__body">
        <div
          className={`m-pick2__rail${q ? ' is-searching' : ''}`}
          role="tablist"
          aria-label={t('Categories')}
          ref={railBox}
          onPointerMove={trackAim}
          onPointerLeave={cancelAim}
        >
          {railRows.map((r, i) => {
            const prev = railRows[i - 1];
            const firstOfKind =
              r.kind != null && (prev?.kind == null || prev.kind !== r.kind);
            return (
              <Fragment key={r.key}>
                {firstOfKind && bothKinds && (
                  <span className="m-pick2__rail-head" aria-hidden="true">
                    {r.kind ? t('Filters') : t('Group properties')}
                  </span>
                )}
                <button
                  type="button"
                  role="tab"
                  data-cat={r.key}
                  aria-selected={cat === r.key && !q}
                  className={`m-pick2__cat${cat === r.key && !q ? ' is-on' : ''}${r.n === 0 ? ' is-empty' : ''}`}
                  onPointerEnter={(e) => aimAt(r.key, e)}
                  onFocus={() => {
                    if (!q) setCat(r.key);
                  }}
                  onClick={() => {
                    cancelAim();
                    setCat(r.key);
                    setQuery('');
                  }}
                >
                  <span className="m-pick2__glyph" aria-hidden="true">
                    {r.key === ALL ? <List size={13} /> : categoryIcon(r.key)}
                  </span>
                  <span className="m-truncate">{r.label}</span>
                  {r.key !== ALL && <span className="m-pick2__n">{r.n}</span>}
                  <ChevronRight
                    size={12}
                    className="m-pick2__chev"
                    aria-hidden="true"
                  />
                </button>
              </Fragment>
            );
          })}
        </div>

        <div className="m-pick2__list">
          {loading ? (
            <p className="m-pick__none">{t('Loading…')}</p>
          ) : shown.length === 0 && !freeRow ? (
            <p className="m-pick__none">{t('Nothing matches that.')}</p>
          ) : (
            <>
              {freeFirst && freeRow}
              {shown.slice(0, limit).map(row)}
              {shown.length > limit && (
                <button
                  type="button"
                  role="menuitem"
                  className="m-pick2__more"
                  onClick={() => setLimit((n) => n + ROW_PAGE)}
                >
                  {t('Show {{n}} more', {
                    n: Math.min(ROW_PAGE, shown.length - limit),
                  })}
                </button>
              )}
              {!freeFirst && freeRow}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import { PopoverPanel } from '@/ui/overlays/popover';
import {
  ALargeSmall,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Globe,
  Hash,
  List,
  ListTree,
  MousePointerClick,
  Search,
  Split,
  Tags,
  Timer,
  ToggleLeft,
  User,
  Zap,
} from 'lucide-react';
import {
  Fragment,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
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
  if (e.isEvent) return <MousePointerClick size={size} />;
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
  auto_captured: <MousePointerClick size={13} />,
  user_events: <Zap size={13} />,
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
  const shown = useMemo(
    () =>
      q
        ? matches
        : cat === ALL
          ? [...entries]
          : entries.filter((e) => e.category === cat),
    [q, matches, cat, entries],
  );

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
  const commit = () => {
    if (shown.length) pick(shown[0]);
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
                    {r.kind ? t('Events') : t('Group filters')}
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
          ) : shown.length === 0 ? (
            <p className="m-pick__none">{t('Nothing matches that.')}</p>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Eases the popover between its contents' heights (a category switch). */
function EasedHeight({ children }: { children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      className="m-pick-ease"
      style={height == null ? undefined : { height }}
    >
      <div ref={inner} className="m-pick-ease__in">
        {children}
      </div>
    </div>
  );
}

/**
 * A picker in a popover. It never flips: the top edge stays under the trigger
 * while the list changes, and the list scrolls inside the room below.
 */
export function PickerPopover({
  open,
  onOpenChange,
  content,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ReactNode;
  children: ReactNode;
}) {
  return (
    <PopoverPanel
      open={open}
      onOpenChange={onOpenChange}
      placement="bottomLeft"
      sideOffset={5}
      avoidCollisions={false}
      className="m-pick-host"
      content={<EasedHeight>{content}</EasedHeight>}
    >
      {children}
    </PopoverPanel>
  );
}

export function FilterPicker({ children, ...rest }: FilterPickerProps) {
  const [open, setOpen] = useState(false);
  return (
    <PickerPopover
      open={open}
      onOpenChange={setOpen}
      content={<PickerBody {...rest} onDone={() => setOpen(false)} />}
    >
      {children}
    </PickerPopover>
  );
}

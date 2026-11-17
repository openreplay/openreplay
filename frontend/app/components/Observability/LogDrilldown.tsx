import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
  type MenuItem,
} from '@/ui/actions/dropdown-menu';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { Tooltip } from '@/ui/overlays/tooltip';
import { CircleMinus, Copy, ListFilter } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import {
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { OtelValueCount } from 'App/services/OtelLogsService';

import { type DrillCard as Card, DRILL_VALUES, keyLabel } from './logs-logic';

export interface LogDrilldownProps {
  cards: readonly Card[];
  /** lines in the window: the presence's base */
  total: number;
  valuesOf: (key: string) => { values: OtelValueCount[]; loading: boolean };
  /** asks for the values of the cards on screen */
  onShown: (keys: string[]) => void;
  /** changes with every fetch, so the cards on screen ask again */
  epoch: number;
  termState: (key: string, value: string) => 'in' | 'out' | undefined;
  onTerm: (
    key: string,
    value: string,
    operator: 'is' | 'isNot',
    on: boolean,
  ) => void;
}

export const DRILL_SIZES = [12, 24, 48] as const;
const DRILL_MIN = 8;
const MARGIN = 24;

function useFitCards(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  has: boolean,
): number {
  const [n, setN] = useState(DRILL_MIN);
  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const measure = () => {
      const grid = ref.current;
      const card = grid?.firstElementChild as HTMLElement | null;
      if (!grid || !card) return;
      const cs = getComputedStyle(grid);
      const cols = Math.max(
        1,
        cs.gridTemplateColumns.split(' ').filter(Boolean).length,
      );
      const gap = parseFloat(cs.rowGap) || 0;
      const row = card.getBoundingClientRect().height + gap;
      const pager =
        grid.nextElementSibling?.getBoundingClientRect().height || 56;
      const room =
        window.innerHeight -
        grid.getBoundingClientRect().top -
        pager -
        MARGIN -
        (parseFloat(cs.marginBottom) || 0) +
        gap;
      const rows = Math.max(2, Math.floor(room / row));
      setN(rows * cols);
    };
    measure();
    let settle = 0;
    const later = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(measure, 120);
    };
    window.addEventListener('resize', measure);
    const ro = new ResizeObserver(later);
    const page = ref.current?.closest('.m-page');
    if (page)
      page
        .querySelectorAll(':scope > .m-page__head, :scope > .m-page__body')
        .forEach((box) => ro.observe(box));
    if (ref.current) ro.observe(ref.current);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener('resize', measure);
      ro.disconnect();
    };
  }, [ref, enabled, has]);
  return n;
}

const pct = (n: number) => {
  const p = n * 100;
  if (p > 0 && p < 1) return '<1%';
  if (p < 100 && p > 99) return '>99%';
  return `${Math.round(p)}%`;
};

export const LogDrilldown = observer(function LogDrilldown({
  cards,
  total,
  valuesOf,
  onShown,
  epoch,
  termState,
  onTerm,
}: LogDrilldownProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? cards.filter(
        (a) =>
          keyLabel(t, a.key).toLowerCase().includes(q) ||
          a.name.toLowerCase().includes(q) ||
          valuesOf(a.key).values.some((v) => v.value.toLowerCase().includes(q)),
      )
    : cards;
  const [page, setPage] = useState(1);
  const [choice, setChoice] = useState<number | 'fit'>('fit');
  const gridRef = useRef<HTMLDivElement>(null);
  const fitN = useFitCards(gridRef, choice === 'fit', shown.length > 0);
  const size = choice === 'fit' ? fitN : choice;
  useEffect(() => setPage(1), [q, cards]);
  const pages = Math.max(1, Math.ceil(shown.length / size));
  const at = Math.min(page, pages);
  const paged = shown.slice((at - 1) * size, at * size);
  const pagedKeys = paged.map((a) => a.key).join('|');
  useEffect(() => {
    if (pagedKeys) onShown(pagedKeys.split('|'));
  }, [pagedKeys, epoch]);

  return (
    <div className="m-logs__drill">
      <div className="m-logs__drill-bar">
        <SearchField
          size="sm"
          placeholder={t('Search attributes and values')}
          value={query}
          onChange={setQuery}
        />
        <span className="m-logs__drill-count">
          {t('{{n}} attributes across {{lines}} lines', {
            n: shown.length,
            count: shown.length,
            lines: total.toLocaleString(),
          })}
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="m-logs__drill-none">
          {q
            ? t('No attribute or value matches “{{q}}”.', { q: query })
            : t('No attributes in this window.')}
        </p>
      ) : (
        <>
          <div ref={gridRef} className="m-logs__drill-grid">
            {paged.map((a) => (
              <DrillCardView
                key={a.key}
                card={a}
                total={total}
                values={valuesOf(a.key)}
                termState={termState}
                onTerm={onTerm}
              />
            ))}
          </div>
          <ListFooter
            page={at}
            pageSize={size}
            total={shown.length}
            noun={(count, n) => t('{{n}} attributes', { count, n })}
            onPage={setPage}
            sizes={DRILL_SIZES}
            sizeLabel={t('Cards')}
            onSize={(n) => {
              setChoice(n);
              setPage(1);
            }}
            fitted={choice === 'fit'}
            onFit={() => {
              setChoice('fit');
              setPage(1);
            }}
          />
        </>
      )}
    </div>
  );
});

function DrillCardView({
  card: a,
  total,
  values: { values, loading },
  termState,
  onTerm,
}: {
  card: Card;
  total: number;
  values: { values: OtelValueCount[]; loading: boolean };
  termState: LogDrilldownProps['termState'];
  onTerm: LogDrilldownProps['onTerm'];
}) {
  const { t } = useTranslation();
  const label = keyLabel(t, a.key);
  const presence = total ? a.carried / total : 0;
  const top = values.slice(0, DRILL_VALUES);
  const inTop = top.reduce((s, v) => s + v.count, 0);
  const rest =
    a.carried > 0 && top.length > 0
      ? Math.max(0, a.carried - inTop) / a.carried
      : 0;
  return (
    <section className="m-logs__drill-card" aria-label={label}>
      <header className="m-logs__drill-head">
        <span className="m-logs__drill-names">
          <span className="m-logs__drill-label">{label}</span>
          {a.name !== label && (
            <span className="m-logs__drill-name">{a.name}</span>
          )}
        </span>
        <Tooltip
          title={t('{{n}} of the lines carry {{name}}', {
            n: a.carried.toLocaleString(),
            name: a.name,
          })}
        >
          <span className="m-logs__drill-presence">
            <svg
              className="m-logs__drill-ring"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <circle
                className="m-logs__drill-ring-track"
                cx="10"
                cy="10"
                r="7.5"
              />
              <circle
                className="m-logs__drill-ring-fill"
                cx="10"
                cy="10"
                r="7.5"
                pathLength={100}
                strokeDasharray={`${Math.max(1, presence * 100)} 100`}
                transform="rotate(-90 10 10)"
              />
            </svg>
            {t('in {{pct}}', { pct: pct(presence) })}
          </span>
        </Tooltip>
      </header>
      <ul className="m-logs__drill-values">
        {loading && top.length === 0 && (
          <li className="m-logs__drill-loading" aria-hidden="true" />
        )}
        {top.map((v) => (
          <li key={v.value}>
            <DrillValueRow
              attrKey={a.key}
              label={label}
              value={v.value}
              share={a.carried ? v.count / a.carried : 0}
              state={termState(a.key, v.value)}
              onTerm={onTerm}
            />
          </li>
        ))}
      </ul>
      <p
        className="m-logs__drill-rest"
        aria-hidden={rest > 0.0005 ? undefined : true}
      >
        {rest > 0.0005 && (
          <>
            {t('more values')} <b>{pct(rest)}</b>
          </>
        )}
      </p>
    </section>
  );
}

function DrillValueRow({
  attrKey,
  label,
  value,
  share,
  state,
  onTerm,
}: {
  attrKey: string;
  label: string;
  value: string;
  share: number;
  state?: 'in' | 'out';
  onTerm: LogDrilldownProps['onTerm'];
}) {
  const { t } = useTranslation();
  const pair = `${label}: ${value}`;
  const items: MenuItem[] = [
    state === 'in'
      ? {
          key: 'in',
          icon: <ListFilter size={14} />,
          label: t('Remove filter'),
          onClick: () => onTerm(attrKey, value, 'is', false),
        }
      : {
          key: 'in',
          icon: <ListFilter size={14} />,
          label: (
            <span className="m-logs__menu-pair">
              {t('Filter by')} <b>{pair}</b>
            </span>
          ),
          onClick: () => onTerm(attrKey, value, 'is', true),
        },
    state === 'out'
      ? {
          key: 'out',
          icon: <CircleMinus size={14} />,
          label: t('Stop excluding'),
          onClick: () => onTerm(attrKey, value, 'isNot', false),
        }
      : {
          key: 'out',
          icon: <CircleMinus size={14} />,
          label: (
            <span className="m-logs__menu-pair">
              {t('Exclude')} <b>{pair}</b>
            </span>
          ),
          onClick: () => onTerm(attrKey, value, 'isNot', true),
        },
    { key: 'd', type: 'divider' },
    {
      key: 'copy',
      icon: <Copy size={14} />,
      label: t('Copy value'),
      onClick: () =>
        void navigator.clipboard?.writeText(value).catch(() => undefined),
    },
  ];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`m-logs__drill-row${state ? ` is-${state}` : ''}`}
          title={value}
        >
          <span
            className="m-logs__drill-fill"
            style={{ width: `${share * 100}%` }}
            aria-hidden="true"
          />
          <span className="m-logs__drill-value">{value}</span>
          {state === 'out' ? (
            <CircleMinus
              size={12}
              className="m-logs__drill-glyph"
              aria-label={t('Left out of the search')}
            />
          ) : state === 'in' ? (
            <ListFilter
              size={12}
              className="m-logs__drill-glyph"
              aria-label={t('In the search')}
            />
          ) : null}
          <span className="m-logs__drill-pct">{pct(share)}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="m-kv__menu">
        <DropdownMenuItems items={items} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

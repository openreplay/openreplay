import { Button } from '@/ui/actions/button';
import '@/ui/filters/filter-menu.css';
import { CheckRow } from '@/ui/inputs/CheckRow';
import '@/ui/inputs/date-range.css';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import { toast } from '@/ui/overlays/toast';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import Widget from 'App/mstore/types/widget';
import { metricService } from 'App/services';
import { debounce } from 'App/utils';

import { cardIcon, cardTypeLabel } from '../../cardIcons';
import AddCardSection from '../AddCardSection/AddCardSection';

const PAGE = 50;
const SKELETON_ROWS = 7;
const MAX_PAGES = 10;

/** Library cards not yet on the dashboard, ticked and added at once; or a new one. */
function CardPicker({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { dashboardStore } = useStore();
  const dashboard = dashboardStore.selectedDashboard;
  const [creating, setCreating] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [cards, setCards] = React.useState<Widget[] | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [picked, setPicked] = React.useState<Set<number>>(() => new Set());
  const [busy, setBusy] = React.useState(false);

  const onBoard = new Set(
    (dashboard?.widgets ?? []).map((w: any) => Number(w.metricId)),
  );
  const boardRef = React.useRef(onBoard);
  boardRef.current = onBoard;

  // typing outruns the API: only the latest search's answer is shown
  const latest = React.useRef(0);
  const load = React.useMemo(
    () =>
      debounce(async (q: string) => {
        const id = ++latest.current;
        try {
          // cards already on the board are skipped, so page on until a
          // screenful is left or the library ends
          const found: Widget[] = [];
          for (let page = 1; page <= MAX_PAGES; page++) {
            const resp: any = await metricService.getMetricsPaginated({
              page,
              limit: PAGE,
              name: q,
            });
            if (id !== latest.current) return;
            const list = (resp.list ?? []).map((m: any) =>
              new Widget().fromJson(m),
            );
            found.push(...list);
            const left = found.filter(
              (c) => !boardRef.current.has(Number(c.metricId)),
            ).length;
            if (left >= PAGE || list.length < PAGE) break;
          }
          setFailed(false);
          setCards(found);
        } catch {
          if (id !== latest.current) return;
          setFailed(true);
          setCards([]);
        }
      }, 250),
    [],
  );
  React.useEffect(() => load(query), [query]);

  const available = (cards ?? []).filter(
    (c) => !onBoard.has(Number(c.metricId)),
  );

  const add = async () => {
    if (!dashboard) return;
    setBusy(true);
    try {
      // a failed add keeps the picker and its selection
      if (!(await dashboardStore.addWidgetToDashboard(dashboard, [...picked])))
        return;
      await dashboardStore
        .fetch(dashboard.dashboardId!)
        .catch(() =>
          toast.error(t('The card was added; reload to see it on the board.')),
        );
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: number) =>
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div
      className="m-fm m-dash__picker"
      role="menu"
      aria-label={t('Add a card to this dashboard')}
      onKeyDown={menuKeyDown}
    >
      <PopoverSearch
        // one field per step: entering a step focuses its search
        key={creating ? 'kinds' : 'cards'}
        placeholder={
          creating ? t('Search kinds of card') : t('Search cards to add')
        }
        value={query}
        onChange={setQuery}
        lead={
          creating ? (
            <button
              type="button"
              className="m-fm__back"
              onClick={() => {
                setCreating(false);
                setQuery('');
              }}
              aria-label={t('Back to your cards')}
            >
              <ChevronLeft size={14} />
              <span>{t('New card')}</span>
            </button>
          ) : null
        }
      />
      {creating ? (
        <div key="create" className="m-fm__body m-dash__picker-body">
          <AddCardSection
            step={{ query }}
            handleOpenChange={(o) => !o && onDone()}
            hideExisting
          />
        </div>
      ) : (
        <>
          <div
            key="cards"
            className="m-fm__body m-dash__picker-body"
            aria-busy={cards == null || undefined}
          >
            <button
              type="button"
              className="m-fm__dim-row"
              onClick={() => {
                setCreating(true);
                setQuery('');
              }}
              aria-haspopup="menu"
            >
              <span className="m-dash__picker-slot" aria-hidden="true" />
              <span className="m-fm__dim-icon" aria-hidden="true">
                <Plus size={14} />
              </span>
              <span className="m-fm__dim-label">{t('Create a new card')}</span>
              <ChevronRight
                size={13}
                className="m-fm__caret"
                aria-hidden="true"
              />
            </button>
            <p className="m-dr__field m-dash__picker-field">
              {t('Your cards')}
            </p>
            {cards == null ? (
              Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <span
                  key={i}
                  className="m-checkrow m-dash__picker-skel"
                  aria-hidden="true"
                >
                  <span className="m-skeleton m-dash__picker-skel-icon" />
                  <span
                    className="m-skeleton m-dash__picker-skel-name"
                    style={{ width: `${46 + ((i * 17) % 30)}%` }}
                  />
                  <span className="m-skeleton m-dash__picker-skel-type" />
                </span>
              ))
            ) : available.length === 0 ? (
              <p className="m-fm__none">
                {failed
                  ? t('Cards could not be loaded. Try again in a moment.')
                  : query
                    ? t('No card matches that.')
                    : t('Every card is already on it.')}
              </p>
            ) : (
              available.map((c) => {
                const Icon = cardIcon(c.metricType, c.metricOf);
                return (
                  <CheckRow
                    key={c.metricId}
                    on={picked.has(c.metricId)}
                    onToggle={() => toggle(c.metricId)}
                    icon={<Icon size={14} />}
                    meta={
                      <span className="m-dash__picker-type">
                        {cardTypeLabel(t, c.metricType, c.metricOf)}
                      </span>
                    }
                  >
                    {c.name}
                  </CheckRow>
                );
              })
            )}
          </div>
          <div className="m-dash__picker-foot">
            <span className="m-dash__picker-count">
              {picked.size > 0
                ? t('{{n}} selected', { n: picked.size, count: picked.size })
                : t('None selected')}
            </span>
            <Button
              variant="primary"
              size="sm"
              disabled={picked.size === 0 || busy}
              onClick={() => void add()}
            >
              {picked.size > 1
                ? t('Add {{n}} cards', { n: picked.size, count: picked.size })
                : t('Add card')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default observer(CardPicker);

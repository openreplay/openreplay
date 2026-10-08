import { Button } from '@/ui/actions/button';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { PopoverSearch } from '@/ui/overlays/PopoverSearch';
import { menuKeyDown } from '@/ui/overlays/menuKeys';
import { Plus } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import Widget from 'App/mstore/types/widget';
import { metricService } from 'App/services';
import { debounce } from 'App/utils';

import { cardIcon, cardTypeLabel } from '../../cardIcons';
import AddCardSection from '../AddCardSection/AddCardSection';

/** Library cards not yet on the dashboard, ticked and added at once; or a new one. */
function CardPicker({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { dashboardStore } = useStore();
  const dashboard = dashboardStore.selectedDashboard;
  const [creating, setCreating] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [cards, setCards] = React.useState<Widget[] | null>(null);
  const [picked, setPicked] = React.useState<Set<number>>(() => new Set());
  const [busy, setBusy] = React.useState(false);

  // typing outruns the API: only the latest search's answer is shown
  const latest = React.useRef(0);
  const load = React.useMemo(
    () =>
      debounce((q: string) => {
        const id = ++latest.current;
        void metricService
          .getMetricsPaginated({ page: 1, limit: 50, name: q })
          .then((resp: any) => {
            if (id !== latest.current) return;
            setCards(
              (resp.list ?? []).map((m: any) => new Widget().fromJson(m)),
            );
          })
          .catch(() => {
            if (id === latest.current) setCards([]);
          });
      }, 250),
    [],
  );
  React.useEffect(() => load(query), [query]);

  const onBoard = new Set(
    (dashboard?.widgets ?? []).map((w: any) => Number(w.metricId)),
  );
  const available = (cards ?? []).filter(
    (c) => !onBoard.has(Number(c.metricId)),
  );

  const add = async () => {
    if (!dashboard) return;
    setBusy(true);
    try {
      await dashboardStore.addWidgetToDashboard(dashboard, [...picked]);
      await dashboardStore.fetch(dashboard.dashboardId!).catch(() => {});
      onDone();
    } finally {
      setBusy(false);
    }
  };

  if (creating) {
    return (
      <AddCardSection handleOpenChange={(o) => !o && onDone()} hideExisting />
    );
  }

  return (
    <div className="m-dash__picker" onKeyDown={menuKeyDown}>
      <p className="m-dash__picker-title">
        {t('Add a card to this dashboard')}
      </p>
      <PopoverSearch
        className="m-dash__picker-search"
        placeholder={t('Search cards')}
        value={query}
        onChange={setQuery}
      />
      {cards == null ? null : available.length === 0 ? (
        <p className="m-dash__picker-empty">
          {query
            ? t('No card matches that.')
            : t('Every card is already on it.')}
        </p>
      ) : (
        <div
          className="m-dash__picker-list"
          role="menu"
          aria-label={t('Cards to add')}
        >
          {available.map((c) => {
            const Icon = cardIcon(c.metricType, c.metricOf);
            return (
              <CheckRow
                key={c.metricId}
                on={picked.has(c.metricId)}
                onToggle={() =>
                  setPicked((prev) => {
                    const n = new Set(prev);
                    if (n.has(c.metricId)) n.delete(c.metricId);
                    else n.add(c.metricId);
                    return n;
                  })
                }
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
          })}
        </div>
      )}
      {picked.size > 0 ? (
        <Button
          variant="primary"
          size="sm"
          className="m-dash__picker-add"
          disabled={busy}
          onClick={() => void add()}
        >
          {picked.size === 1
            ? t('Add 1 card')
            : t('Add {{n}} cards', { n: picked.size })}
        </Button>
      ) : null}
      <Button
        variant="subtle"
        className="m-dash__picker-new"
        onClick={() => setCreating(true)}
      >
        <Plus size={13} />
        {t('Create a new card')}
      </Button>
    </div>
  );
}

export default observer(CardPicker);

import { Button } from '@/ui/actions/button';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { SearchField } from '@/ui/inputs/SearchField';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import type Widget from 'App/mstore/types/widget';

import '../../product-analytics.css';

interface Props {
  dashboardId?: number;
  siteId: string;
}

/** Saved cards not yet on this dashboard; pick some and add them. */
function MetricsLibraryModal({ dashboardId }: Props) {
  const { t } = useTranslation();
  const { hideModal } = useModal();
  const { metricStore, dashboardStore } = useStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const dashboard = useMemo(
    () =>
      dashboardId != null ? dashboardStore.getDashboard(dashboardId) : null,
    [dashboardId],
  );

  useEffect(() => {
    metricStore.updateKey('page', 1);
    metricStore.updateKey('listView', true);
    return () => {
      metricStore.updateKey('filter', { ...metricStore.filter, query: '' });
    };
  }, []);
  useEffect(() => {
    void metricStore.fetchList();
  }, [metricStore.page, metricStore.filter, metricStore.sort]);

  const existing = useMemo(
    () => new Set(dashboard?.widgets?.map((w: any) => String(w.metricId))),
    [dashboard],
  );
  const cards: Widget[] = metricStore.filteredCards.filter(
    (c: Widget) => !existing.has(String(c.metricId)),
  );

  const add = () => {
    if (!dashboard?.dashboardId) return;
    void dashboardStore
      .addWidgetToDashboard(dashboard, selected.map(Number))
      .then(() => {
        hideModal();
        void dashboardStore.fetch(dashboard.dashboardId!).catch(() => {});
      });
  };

  const columns: Column<Widget>[] = [
    {
      title: t('Title'),
      key: 'name',
      render: (c) => (
        <span className="text-sm font-medium text-content-primary">
          {c.name}
        </span>
      ),
    },
    {
      title: t('Owner'),
      key: 'owner',
      width: 180,
      render: (c) => (
        <span className="text-sm text-content-secondary">{c.owner}</span>
      ),
    },
    {
      title: t('Last modified'),
      key: 'modified',
      width: 130,
      render: (c) =>
        c.lastModified ? (
          <RelativeTime
            at={(c.lastModified as any).toMillis?.() ?? c.lastModified}
          />
        ) : null,
    },
  ];

  return (
    <div className="m-cardlib">
      <header className="m-cardlib__head">
        <h2 className="m-cardlib__title">{t('Cards library')}</h2>
        <SearchField
          placeholder={t('Filter by title or owner')}
          value={query}
          onChange={(v) => {
            setQuery(v);
            metricStore.updateKey('filter', {
              ...metricStore.filter,
              query: v,
            });
          }}
        />
      </header>
      <div className="m-cardlib__body">
        {metricStore.isLoading && cards.length === 0 ? (
          <SkeletonRows rows={6} columns={[60, 25, 15]} />
        ) : cards.length === 0 ? (
          <EmptyState
            art="cards"
            title={
              query
                ? t('No cards match “{{q}}”', { q: query })
                : t('Every saved card is already on this dashboard')
            }
          />
        ) : (
          <DataTable<Widget>
            ariaLabel={t('Saved cards')}
            columns={columns}
            rows={cards}
            rowKey={(c) => String(c.metricId)}
            selection={{
              selected,
              onChange: setSelected,
              label: (c) => t('Select {{name}}', { name: c.name }),
            }}
            onRowClick={(c) => {
              const id = String(c.metricId);
              setSelected((s) =>
                s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
              );
            }}
          />
        )}
      </div>
      <footer className="m-cardlib__foot">
        <span className="text-sm text-content-muted">
          {t('{{n}} of {{total}} selected', {
            n: selected.length,
            total: cards.length,
          })}
        </span>
        <Button variant="subtle" className="ml-auto" onClick={hideModal}>
          {t('Cancel')}
        </Button>
        <Button variant="primary" disabled={!selected.length} onClick={add}>
          {t('Add to dashboard')}
        </Button>
      </footer>
    </div>
  );
}

export default observer(MetricsLibraryModal);

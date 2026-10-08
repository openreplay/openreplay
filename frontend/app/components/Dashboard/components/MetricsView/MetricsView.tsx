import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable, type TableSort } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { PopoverPanel } from '@/ui/overlays/popover';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import withPageTitle from 'HOCs/withPageTitle';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { CATEGORIES, DROPDOWN_OPTIONS, TYPE_NAMES } from 'App/constants/card';
import { useStore } from 'App/mstore';
import type Widget from 'App/mstore/types/widget';
import { withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import { debounce } from 'App/utils';

import { cardIcon } from '../../cardIcons';
import '../../product-analytics.css';
import AddCardSection from '../AddCardSection/AddCardSection';

const SORT_FIELDS: Record<string, string> = {
  name: 'name',
  owner: 'owner_email',
  updatedAt: 'edited_at',
};

function MetricsView({ siteId }: { siteId: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const history = useHistory();
  const { metricStore } = useStore();
  const { filter, page, pageSize, total, isLoading } = metricStore;
  const cards = metricStore.filteredCards;
  const [query, setQuery] = React.useState<string>(filter.query ?? '');
  const [loaded, setLoaded] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [renaming, setRenaming] = React.useState<Widget | null>(null);
  const [deleting, setDeleting] = React.useState<Widget | null>(null);

  React.useEffect(() => {
    void metricStore.fetchList().finally(() => setLoaded(true));
  }, [metricStore.page, metricStore.filter, metricStore.sort]);

  const pushQuery = React.useMemo(
    () =>
      debounce((v: string) => {
        metricStore.updateKey('page', 1);
        metricStore.updateKey('filter', { ...metricStore.filter, query: v });
      }, 300),
    [],
  );

  const type = filter.type || 'all';
  const filtered = !!filter.query || type !== 'all';
  const noneAtAll = loaded && !isLoading && cards.length === 0 && !filtered;

  const sortKey = Object.keys(SORT_FIELDS).find(
    (k) => SORT_FIELDS[k] === metricStore.sort.field,
  );
  const sort: TableSort | null =
    sortKey && metricStore.sort.order
      ? { key: sortKey, desc: metricStore.sort.order === 'descend' }
      : null;
  const onSort = (key: string | null, desc: boolean) => {
    metricStore.updateKey(
      'sort',
      key
        ? { field: SORT_FIELDS[key], order: desc ? 'descend' : 'ascend' }
        : { columnKey: '', field: '', order: false },
    );
    metricStore.updateKey('page', 1);
  };

  const remove = async (c: Widget) => {
    setDeleting(null);
    try {
      await metricStore.delete(c);
      void metricStore.fetchList();
    } catch {
      toast.error(t('Failed to delete card'));
    }
  };

  const rename = async (c: Widget, name: string) => {
    setRenaming(null);
    const before = c.name;
    try {
      c.update({ name });
      await metricStore.save(c);
    } catch {
      // the list keeps the name the server has
      c.update({ name: before });
      toast.error(t('Failed to rename card'));
    }
  };

  const typeNames = TYPE_NAMES(t) as Record<string, string>;
  const columns: Column<Widget>[] = [
    {
      title: t('Title'),
      key: 'name',
      width: '36%',
      sortable: true,
      render: (c) => {
        const Icon = cardIcon(c.metricType, c.metricOf);
        return (
          <div className="m-pa__type-cell">
            <Tooltip
              title={typeNames[c.metricType] ?? c.metricType}
              delay={300}
            >
              <span className="m-pa__type-avatar" aria-hidden="true">
                <Icon size={13} />
              </span>
            </Tooltip>
            <span className="m-truncate">{c.name}</span>
          </div>
        );
      },
    },
    {
      title: t('Owner'),
      key: 'owner',
      width: '27%',
      sortable: true,
      render: (c) => <span className="m-truncate">{c.owner}</span>,
    },
    {
      title: t('Last modified'),
      key: 'updatedAt',
      width: '22%',
      sortable: true,
      render: (c) =>
        c.lastModified ? (
          <RelativeTime at={(c.lastModified as any).toMillis?.() ?? 0} />
        ) : null,
    },
    {
      title: '',
      key: 'actions',
      width: '15%',
      align: 'right',
      render: (c) => (
        <span onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="subtle"
                size="icon"
                aria-label={t('Actions for {{name}}', { name: c.name })}
              >
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={[
                  {
                    key: 'rename',
                    icon: <Pencil size={13} />,
                    label: t('Rename'),
                    onClick: () => setRenaming(c),
                  },
                  {
                    key: 'delete',
                    icon: <Trash2 size={13} />,
                    label: t('Delete'),
                    danger: true,
                    onClick: () => setDeleting(c),
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const createCard = (variant: 'primary' | 'secondary') => (
    <PopoverPanel
      open={adding}
      onOpenChange={setAdding}
      placement="bottomRight"
      className="p-5"
      content={<AddCardSection inCards handleOpenChange={setAdding} />}
    >
      <Button variant={variant}>
        <Plus size={14} />
        {t('Create card')}
      </Button>
    </PopoverPanel>
  );

  return (
    <PageCard
      title={t('Cards')}
      subtitle={t('Charts and tables you can add to dashboards.')}
      actions={
        <>
          {noneAtAll ? null : (
            <SearchField
              placeholder={t('Search cards')}
              value={query}
              onChange={(v) => {
                setQuery(v);
                pushQuery(v);
              }}
            />
          )}
          {createCard('primary')}
        </>
      }
      toolbar={
        noneAtAll ? undefined : (
          <FilterStrip
            label={t('Filter by type')}
            items={[
              { key: 'all', label: t('All types') },
              ...DROPDOWN_OPTIONS(t).map((o) => ({
                key: o.value,
                label: o.label,
              })),
              { key: CATEGORIES.monitors, label: t('Monitors') },
              { key: CATEGORIES.web_analytics, label: t('Web Analytics') },
            ]}
            selected={[type]}
            onSelect={(key) => {
              metricStore.updateKey('page', 1);
              metricStore.updateKey('filter', { ...filter, type: key });
            }}
          />
        )
      }
    >
      {!loaded || (isLoading && cards.length === 0) ? (
        <SkeletonRows rows={4} columns={[36, 27, 22, 15]} />
      ) : noneAtAll ? (
        <EmptyState
          art="cards"
          title={t('No cards yet')}
          hint={t(
            'A card asks one question of your sessions: a trend, a funnel, a journey, a heatmap. Make one here, then put it on any dashboard.',
          )}
          action={createCard('secondary')}
        />
      ) : cards.length === 0 ? (
        <EmptyState
          art="search"
          title={
            filter.query
              ? t('No cards match your search')
              : t('No cards of this type')
          }
          hint={t('Clear the search, or pick another type.')}
          action={
            <Button
              onClick={() => {
                setQuery('');
                metricStore.updateKey('page', 1);
                metricStore.updateKey('filter', { type: 'all', query: '' });
              }}
            >
              {t('Show all cards')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable<Widget>
            className="m-pa__table"
            rowKey={(c) => String(c.metricId)}
            columns={columns}
            rows={cards}
            sort={sort}
            onSort={onSort}
            rowClassName={() => 'm-pa__row'}
            onRowClick={(c) =>
              history.push(withSiteId(`/metrics/${c.metricId}`, siteId))
            }
            ariaLabel={t('Cards')}
          />
          <ListFooter
            page={page}
            pageSize={pageSize}
            total={total}
            noun={[t('card'), t('cards')]}
            onPage={(p) => metricStore.updateKey('page', p)}
          />
        </>
      )}

      <RenameDialog
        open={renaming != null}
        title={t('Rename card')}
        value={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={(name) => renaming && void rename(renaming, name)}
      />
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete this card?')}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => deleting && void remove(deleting)}
      >
        {t(
          'The card is removed from every dashboard it is on. This cannot be undone.',
        )}
      </ConfirmDialog>
    </PageCard>
  );
}

export default withPageTitle('Cards - OpenReplay')(observer(MetricsView));

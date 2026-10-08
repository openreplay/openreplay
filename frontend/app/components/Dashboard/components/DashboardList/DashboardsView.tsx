import { useLocalSort } from '@/lib/use-local-sort';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { CheckRow } from '@/ui/inputs/CheckRow';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { Modal } from '@/ui/overlays/modal';
import withPageTitle from 'HOCs/withPageTitle';
import {
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import type Dashboard from 'App/mstore/types/dashboard';
import { dashboardSelected, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';

import '../../product-analytics.css';
import {
  CreateDashboardDrawer,
  type NewDashboardSpec,
} from './CreateDashboardDrawer';

const PAGE = 20;
const millis = (d: Dashboard) => d.updatedAt?.toMillis?.() ?? 0;
const SORT: Record<string, (a: Dashboard, b: Dashboard) => number> = {
  name: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
  owner: (a, b) => (a.owner ?? '').localeCompare(b.owner ?? ''),
  updatedAt: (a, b) => millis(b) - millis(a),
};

function DashboardsView() {
  const { t } = useTranslation();
  const history = useHistory();
  const { dashboardStore, projectsStore } = useStore();
  const { siteId } = projectsStore;
  const [creating, setCreating] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [renaming, setRenaming] = React.useState<Dashboard | null>(null);
  const [accessFor, setAccessFor] = React.useState<Dashboard | null>(null);
  const [deleting, setDeleting] = React.useState<Dashboard | null>(null);
  const [page, setPage] = React.useState(1);

  const { query, showMine } = dashboardStore.filter;
  const list = dashboardStore.filteredList;
  const { sort, onSort, sorted } = useLocalSort(list, SORT);
  const rows = sorted.slice((page - 1) * PAGE, page * PAGE);
  const noneAtAll = dashboardStore.dashboards.length === 0;

  const setFilter = (patch: Partial<typeof dashboardStore.filter>) => {
    dashboardStore.updateKey('filter', { ...dashboardStore.filter, ...patch });
    setPage(1);
  };

  const open = (d: Dashboard) => {
    dashboardStore.selectDashboardById(d.dashboardId);
    history.push(withSiteId(dashboardSelected(d.dashboardId), siteId));
  };

  const update = (d: Dashboard, patch: Partial<Dashboard>) => {
    dashboardStore.initDashboard(d);
    dashboardStore.dashboardInstance.update(patch);
    void dashboardStore.save(dashboardStore.dashboardInstance);
  };

  const create = async (spec: NewDashboardSpec) => {
    setBusy(true);
    dashboardStore.initDashboard();
    dashboardStore.dashboardInstance.update({
      name: spec.name,
      isPublic: spec.isPublic,
    });
    dashboardStore.updateKey('selectedWidgets', spec.cards);
    try {
      const saved = await dashboardStore.save(dashboardStore.dashboardInstance);
      setCreating(false);
      dashboardStore.selectDashboardById(saved.dashboardId);
      history.push(withSiteId(dashboardSelected(saved.dashboardId), siteId));
    } finally {
      dashboardStore.updateKey('selectedWidgets', []);
      setBusy(false);
    }
  };

  const columns: Column<Dashboard>[] = [
    {
      title: t('Title'),
      key: 'name',
      width: '31%',
      sortable: true,
      render: (d) => <span className="m-truncate">{d.name}</span>,
    },
    {
      title: t('Owner'),
      key: 'owner',
      width: '20%',
      sortable: true,
      render: (d) => <span className="m-truncate">{d.owner}</span>,
    },
    {
      title: t('Last modified'),
      key: 'updatedAt',
      width: '20%',
      sortable: true,
      render: (d) => <RelativeTime at={millis(d)} />,
    },
    {
      title: t('Visibility'),
      key: 'visibility',
      width: '19%',
      render: (d) => (
        <Chip kind="tag">
          {d.isPublic ? <Users size={11} /> : <Lock size={11} />}
          {d.isPublic ? t('Team') : t('Private')}
        </Chip>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      align: 'right',
      render: (d) => (
        <span onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="subtle"
                size="icon"
                aria-label={t('Actions for {{name}}', { name: d.name })}
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
                    onClick: () => setRenaming(d),
                  },
                  {
                    key: 'access',
                    icon: <Users size={13} />,
                    label: t('Visibility & access'),
                    onClick: () => setAccessFor(d),
                  },
                  {
                    key: 'delete',
                    icon: <Trash2 size={13} />,
                    label: t('Delete'),
                    danger: true,
                    onClick: () => setDeleting(d),
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const createButton = (
    <Button variant="primary" onClick={() => setCreating(true)}>
      <Plus size={14} />
      {t('Create dashboard')}
    </Button>
  );

  return (
    <PageCard
      title={t('Dashboards')}
      subtitle={t('Collections of cards for the metrics you follow.')}
      actions={
        <>
          {noneAtAll ? null : (
            <SearchField
              placeholder={t('Search dashboards')}
              value={query ?? ''}
              onChange={(v) => setFilter({ query: v })}
            />
          )}
          {createButton}
        </>
      }
      toolbar={
        noneAtAll ? undefined : (
          <FilterStrip
            label={t('Filter by visibility')}
            items={[
              { key: 'all', label: t('All dashboards') },
              { key: 'private', label: t('Private') },
            ]}
            selected={[showMine ? 'private' : 'all']}
            onSelect={(key) => setFilter({ showMine: key === 'private' })}
          />
        )
      }
    >
      {noneAtAll ? (
        <EmptyState
          art="dashboard"
          title={t('No dashboards yet')}
          hint={t(
            'A dashboard is a few cards on one page. Pick from the cards you have saved, or start empty.',
          )}
          action={createButton}
        />
      ) : list.length === 0 ? (
        <EmptyState
          art="search"
          title={
            query
              ? t('No dashboards match your search')
              : t('No dashboards here yet')
          }
          hint={t('Clear the search, or switch back to all dashboards.')}
          action={
            <Button onClick={() => setFilter({ query: '', showMine: false })}>
              {t('Show all dashboards')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable<Dashboard>
            className="m-pa__table"
            rowKey={(d) => String(d.dashboardId)}
            columns={columns}
            rows={rows}
            sort={sort}
            onSort={onSort}
            rowClassName={() => 'm-pa__row'}
            onRowClick={open}
            ariaLabel={t('Dashboards')}
          />
          <ListFooter
            page={page}
            pageSize={PAGE}
            total={list.length}
            noun={[t('dashboard'), t('dashboards')]}
            onPage={setPage}
          />
        </>
      )}

      <CreateDashboardDrawer
        key={creating ? 'open' : 'closed'}
        open={creating}
        busy={busy}
        onClose={() => setCreating(false)}
        onCreate={(spec) => void create(spec)}
      />
      <RenameDialog
        open={renaming != null}
        title={t('Rename dashboard')}
        value={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={(name) => {
          if (renaming) update(renaming, { name });
          setRenaming(null);
        }}
      />
      <Modal
        title={t('Visibility & access')}
        open={accessFor != null}
        onCancel={() => setAccessFor(null)}
        footer={null}
        width={440}
      >
        <div className="flex flex-col gap-1">
          {[true, false].map((pub) => (
            <CheckRow
              key={String(pub)}
              single
              on={accessFor?.isPublic === pub}
              onToggle={() => {
                if (accessFor && accessFor.isPublic !== pub)
                  update(accessFor, { isPublic: pub });
                setAccessFor(null);
              }}
            >
              {pub ? t('Team') : t('Personal')}
            </CheckRow>
          ))}
        </div>
        <p className="m-dlg__lede mt-4">
          {t('Team can see and edit the dashboard.')}
        </p>
      </Modal>
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete this dashboard?')}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => {
          if (deleting) void dashboardStore.deleteDashboard(deleting);
          setDeleting(null);
        }}
      >
        {t(
          'The dashboard is removed for everyone. Its cards stay in the library.',
        )}
      </ConfirmDialog>
    </PageCard>
  );
}

export default withPageTitle('Dashboards - OpenReplay')(
  observer(DashboardsView),
);

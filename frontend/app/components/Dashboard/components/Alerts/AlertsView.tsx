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
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { toast } from '@/ui/overlays/toast';
import withPageTitle from 'HOCs/withPageTitle';
import type Alert from 'Types/alert';
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { alertCreate, alertEdit, withSiteId } from 'App/routes';
import { useHistory, useLocation } from 'App/routing';
import { filterList } from 'App/utils';

import '../../product-analytics.css';
import { alertSentence } from './alertSentence';

const PAGE = 10;

function AlertsView({ siteId }: { siteId: string }) {
  const { t } = useTranslation();
  const history = useHistory();
  const location = useLocation();
  const { alertsStore, settingsStore } = useStore();
  const { alerts, alertsSearch, page } = alertsStore;
  const { webhooks } = settingsStore;
  const [loaded, setLoaded] = React.useState(false);
  const [deleting, setDeleting] = React.useState<Alert | null>(null);

  useEffect(() => {
    if (!location.pathname.includes('/alert')) alertsStore.updateKey('page', 1);
  }, [location.pathname]);
  useEffect(() => {
    void alertsStore.fetchList().finally(() => setLoaded(true));
    void settingsStore.fetchWebhooks();
  }, []);

  const list: Alert[] =
    alertsSearch !== ''
      ? filterList(alerts, alertsSearch, ['name'], (item: any, q: RegExp) =>
          q.test(item.query.left),
        )
      : alerts;
  const rows = list.slice((page - 1) * PAGE, page * PAGE);

  const open = (a: Alert) => {
    alertsStore.init(a);
    history.push(withSiteId(alertEdit(a.alertId), siteId));
  };
  const create = () => history.push(withSiteId(alertCreate(), siteId));

  const columns: Column<Alert>[] = [
    {
      title: t('Title'),
      key: 'name',
      width: '56%',
      render: (a) => {
        const rule = alertSentence(a, webhooks);
        return (
          <div className="m-pa__name-cell">
            <span className="m-truncate">{a.name}</span>
            <span className="m-pa__rule m-truncate" title={rule}>
              {rule}
            </span>
          </div>
        );
      },
    },
    {
      title: t('Type'),
      key: 'type',
      width: '16%',
      render: (a) => (
        <Chip kind="tag">
          {a.detectionMethod === 'change' ? t('Change') : t('Threshold')}
        </Chip>
      ),
    },
    {
      title: t('Modified'),
      key: 'modified',
      width: '18%',
      render: (a) => <RelativeTime at={a.createdAt || Date.now()} />,
    },
    {
      title: '',
      key: 'actions',
      width: '10%',
      align: 'right',
      render: (a) => (
        <span onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="subtle"
                size="icon"
                aria-label={t('Actions for {{name}}', { name: a.name })}
              >
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={[
                  {
                    key: 'edit',
                    icon: <Pencil size={13} />,
                    label: t('Edit'),
                    onClick: () => open(a),
                  },
                  {
                    key: 'delete',
                    icon: <Trash2 size={13} />,
                    label: t('Delete'),
                    danger: true,
                    onClick: () => setDeleting(a),
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      ),
    },
  ];

  const createButton = (variant: 'primary' | 'secondary') => (
    <Button variant={variant} onClick={create}>
      <Plus size={14} />
      {t('Create alert')}
    </Button>
  );
  const noneAtAll = loaded && alerts.length === 0;

  return (
    <PageCard
      title={t('Alerts')}
      subtitle={t('Notifications when a metric crosses a threshold.')}
      actions={
        <>
          {noneAtAll ? null : (
            <SearchField
              placeholder={t('Search alerts')}
              value={alertsSearch}
              onChange={(v) => {
                alertsStore.changeSearch(v);
                alertsStore.updateKey('page', 1);
              }}
            />
          )}
          {createButton('primary')}
        </>
      }
    >
      {!loaded && alertsStore.loading ? (
        <SkeletonRows rows={4} columns={[56, 16, 18, 10]} />
      ) : noneAtAll ? (
        <EmptyState
          art="alert"
          title={t('No alerts yet')}
          hint={t(
            'An alert watches a card and writes to you when its number crosses a line, or moves too fast. Pick the card, set the line.',
          )}
          action={createButton('secondary')}
        />
      ) : list.length === 0 ? (
        <EmptyState
          art="search"
          title={t('No alerts match your search')}
          hint={t('Clear the search to see every alert.')}
          action={
            <Button onClick={() => alertsStore.changeSearch('')}>
              {t('Show all alerts')}
            </Button>
          }
        />
      ) : (
        <>
          <DataTable<Alert>
            className="m-pa__table"
            rowKey={(a) => String(a.alertId)}
            columns={columns}
            rows={rows}
            rowClassName={() => 'm-pa__row'}
            onRowClick={open}
            ariaLabel={t('Alerts')}
          />
          <ListFooter
            page={page}
            pageSize={PAGE}
            total={list.length}
            noun={[t('alert'), t('alerts')]}
            onPage={(p) => alertsStore.updateKey('page', p)}
          />
        </>
      )}
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete this alert?')}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => {
          if (deleting)
            alertsStore
              .remove(String(deleting.alertId))
              .then(() => toast.success(t('Alert deleted')))
              .catch(() => toast.error(t('Failed to delete an alert')));
          setDeleting(null);
        }}
      >
        {t('Notifications for {{name}} stop. This cannot be undone.', {
          name: deleting?.name ?? '',
        })}
      </ConfirmDialog>
    </PageCard>
  );
}

export default withPageTitle('Alerts - OpenReplay')(observer(AlertsView));

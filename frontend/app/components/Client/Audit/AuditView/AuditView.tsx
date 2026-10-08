import { Button } from '@/ui/actions/button';
import { Chip } from '@/ui/data/Chip';
import { CodeBlock } from '@/ui/data/CodeBlock';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DateRange } from '@/ui/inputs/DateRange';
import { SearchField } from '@/ui/inputs/SearchField';
import { SimpleSelect } from '@/ui/inputs/select';
import { ListFooter } from '@/ui/layout/ListFooter';
import { EntityDrawer, MetaGrid, Section } from '@/ui/overlays/EntityDrawer';
import withPageTitle from 'HOCs/withPageTitle';
import { Download } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { checkForRecent } from 'App/date';
import { useStore } from 'App/mstore';
import { debounce, numberWithCommas } from 'App/utils';

import PreferencesPage from '../../PreferencesPage';

function AuditView() {
  const { t } = useTranslation();
  const { auditStore } = useStore();
  const { list, page, pageSize, order, period, searchQuery, isLoading } =
    auditStore;
  const [query, setQuery] = React.useState(searchQuery);
  const [open, setOpen] = React.useState<any | null>(null);
  const push = React.useMemo(
    () =>
      debounce((v: string) => {
        auditStore.updateKey('searchQuery', v);
        auditStore.updateKey('page', 1);
      }, 300),
    [],
  );

  useEffect(() => () => auditStore.updateKey('searchQuery', ''), []);

  useEffect(() => {
    const { startTimestamp, endTimestamp } = period.toTimestamps();
    void auditStore.fetchAudits({
      page,
      limit: pageSize,
      query: searchQuery,
      order,
      startDate: startTimestamp,
      endDate: endTimestamp,
    });
  }, [page, searchQuery, order, period]);

  const when = (a: any) =>
    a.createdAt ? checkForRecent(a.createdAt, 'LLL dd, yyyy, hh:mm a') : '';

  const columns: Column<any>[] = [
    {
      title: t('Name'),
      key: 'who',
      width: '30%',
      render: (a) =>
        a.username ? (
          <span className="m-truncate">{a.username}</span>
        ) : (
          <span className="m-pref__hint">{t('API token')}</span>
        ),
    },
    {
      title: t('Action'),
      key: 'action',
      width: '45%',
      render: (a) => <span className="m-truncate">{a.action}</span>,
    },
    {
      title: t('Time'),
      key: 'when',
      width: '25%',
      render: (a) => <span className="m-truncate m-pref__hint">{when(a)}</span>,
    },
  ];

  return (
    <PreferencesPage
      title={t('Audit Trail')}
      value={t('{{n}} actions', { n: numberWithCommas(auditStore.total) })}
      flush
      actions={
        <>
          <DateRange
            field={t('Created')}
            period={period}
            onChange={(p) => auditStore.setDateRange(p)}
          />
          <SimpleSelect<string>
            value={order}
            ariaLabel={t('Order')}
            onChange={(v) => v && auditStore.updateKey('order', v)}
            options={[
              { value: 'desc', label: t('Newest first') },
              { value: 'asc', label: t('Oldest first') },
            ]}
            className="m-pref__w-sm"
          />
          <SearchField
            placeholder={t('Filter by name or action')}
            value={query}
            onChange={(v) => {
              setQuery(v);
              push(v);
            }}
          />
          <Button onClick={() => auditStore.exportToCsv()}>
            <Download size={14} />
            {t('Export CSV')}
          </Button>
        </>
      }
    >
      {isLoading && list.length === 0 ? (
        <SkeletonRows rows={5} columns={[30, 45, 25]} />
      ) : list.length === 0 ? (
        <div className="m-pref__list-empty">
          <EmptyState
            art="search"
            title={
              searchQuery
                ? t('Nothing matches “{{q}}”', { q: searchQuery })
                : t('Nothing in this window')
            }
            hint={
              searchQuery
                ? t('Try a name or an action, or clear the search.')
                : t('Widen the date window to see older actions.')
            }
          />
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={list}
            rowKey={(a: any) => String(a.id ?? `${a.createdAt}-${a.action}`)}
            onRowClick={setOpen}
            ariaLabel={t('Audit trail')}
          />
          <ListFooter
            page={page}
            pageSize={pageSize}
            total={auditStore.total}
            noun={[t('action'), t('actions')]}
            onPage={(p) => auditStore.updateKey('page', p)}
          />
        </>
      )}
      <EntityDrawer
        open={open != null}
        onClose={() => setOpen(null)}
        eyebrow={t('Audit trail')}
        title={open?.action ?? ''}
      >
        <Section title={t('Request')}>
          <div className="m-pref__row">
            {open?.method ? <Chip kind="tag">{open.method}</Chip> : null}
            <code className="m-pref__mono">{open?.endPoint}</code>
          </div>
        </Section>
        <Section title={t('Who and when')}>
          <MetaGrid
            items={[
              { label: t('Name'), value: open?.username || t('API token') },
              { label: t('Time'), value: open ? when(open) : '' },
              { label: t('Action'), value: open?.action },
              { label: t('Method'), value: open?.method },
            ]}
          />
        </Section>
        {open?.payload ? (
          <Section title={t('Payload')}>
            <CodeBlock
              code={JSON.stringify(open.payload, null, 2)}
              language="JSON"
            />
          </Section>
        ) : null}
      </EntityDrawer>
    </PreferencesPage>
  );
}

export default withPageTitle('Audit Trail - OpenReplay Preferences')(
  observer(AuditView),
);

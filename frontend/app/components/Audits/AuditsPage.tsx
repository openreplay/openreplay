import withPageTitle from '@/components/hocs/withPageTitle';
import withPermissions from '@/components/hocs/withPermissions';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
  type MenuItem,
} from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import { ProgressBar } from '@/ui/data/ProgressBar';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DisplayShell, MenuSelect } from '@/ui/filters/DisplayMenu';
import { FilterStrip, type FilterStripProps } from '@/ui/filters/FilterStrip';
import { PhoneFilters } from '@/ui/filters/PhoneFilters';
import { DateRange } from '@/ui/inputs/DateRange';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { setRowsPerPage, useRowsPerPage } from '@/ui/layout/rows-per-page';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { LAST_30_DAYS } from 'Types/app/period';
import {
  Ban,
  Download,
  FileText,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Presentation,
  RotateCcw,
  ScanSearch,
  Split,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useQueryParam } from 'App/components/Client/SmartTests/components/shared/useUrlState';
import useDebouncedValue from 'App/hooks/useDebouncedValue';
import { useStore } from 'App/mstore';

import { StartPath } from 'Shared/StartPath/StartPath';

import { AuditsFilterMenu } from './AuditsFilterMenu';
import NewAuditDrawer from './NewAuditDrawer';
import './audits-page.css';
import {
  AUDIT_FIELD_CHOICES,
  AUDIT_SORT_CHOICES,
  AuditFieldKey,
  AuditItem,
  AuditSortKey,
  AuditTab,
} from './model';
import {
  useAuditCounts,
  useAuditLandings,
  useAuditList,
  useCancelAudit,
  useDeleteAudit,
  useOpenArtifact,
  useRenameAudit,
  useRerunAudit,
} from './queries';
import { auditsUi as ui } from './store';

const fmt = (n: number) => n.toLocaleString('en-US');

/** The address that opens an audit's report (`slide` is 1-based). */
export function reportLink(auditId: string, slide?: number): string {
  const url = new URL(window.location.href);
  url.hash = '';
  url.search = '';
  url.searchParams.set('audit', auditId);
  if (slide != null) url.searchParams.set('slide', String(slide));
  return url.toString();
}

function AuditsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const { userStore } = useStore();
  const me = userStore.account?.id;
  const pageSize = useRowsPerPage('audits');

  const [query, setQuery] = React.useState(ui.search);
  const settled = useDebouncedValue(query, 300);
  React.useEffect(() => {
    if (settled !== ui.search) ui.setSearch(settled);
  }, [settled]);

  const params = ui.listParams(pageSize);
  const list = useAuditList(params);
  const counts = useAuditCounts(ui.countsParams);
  const ever = useAuditCounts();
  const items = list.data?.items;
  const total = list.data?.total ?? 0;

  const [, setOpenAudit] = useQueryParam('audit');
  const [creating, setCreating] = React.useState(false);
  const [draftKey, setDraftKey] = React.useState(0);
  const [renaming, setRenaming] = React.useState<AuditItem | null>(null);
  const [deleting, setDeleting] = React.useState<AuditItem | null>(null);
  const [cancelling, setCancelling] = React.useState<AuditItem | null>(null);

  const rename = useRenameAudit();
  const remove = useDeleteAudit();
  const cancel = useCancelAudit();
  const rerun = useRerunAudit();
  const artifact = useOpenArtifact();
  const failed = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : t('Something went wrong.'));

  useAuditLandings(items, JSON.stringify(params), (a) => {
    if (a.isReady) toast.success(t('“{{name}}” is ready', { name: a.name }));
    else if (a.isFailed) toast.error(t('“{{name}}” failed', { name: a.name }));
  });

  const newAudit = () => {
    setDraftKey((k) => k + 1);
    setCreating(true);
  };

  const openReport = (a: AuditItem) => {
    if (!a.isReady) {
      toast.info(
        a.isActive
          ? t(
              'This audit is still being made. The report opens when it is ready.',
            )
          : t('This audit has no report.'),
      );
      return;
    }
    setOpenAudit(a.id, true);
  };

  const copyLink = (a: AuditItem) => {
    void navigator.clipboard?.writeText(reportLink(a.id)).catch(() => {});
    toast.success(t('Link copied'));
  };

  const doRerun = (a: AuditItem) =>
    rerun.mutate(a.id, {
      onSuccess: () => {
        ui.showAll();
        setQuery('');
        toast.success(t('Audit started again, ready in a few minutes'));
      },
      onError: failed,
    });

  const rowMenu = (a: AuditItem): MenuItem[] => {
    const items: MenuItem[] = [];
    if (a.isReady)
      items.push({
        key: 'open',
        icon: <Presentation size={13} />,
        label: t('Open report'),
        onClick: () => openReport(a),
      });
    if (a.canEdit)
      items.push({
        key: 'rename',
        icon: <Pencil size={13} />,
        label: t('Rename'),
        onClick: () => setRenaming(a),
      });
    if (a.canRerun)
      items.push({
        key: 'rerun',
        icon: <RotateCcw size={13} />,
        label: t('Run again'),
        onClick: () => doRerun(a),
      });
    if (a.isActive && a.canEdit)
      items.push({
        key: 'cancel',
        icon: <Ban size={13} />,
        label: t('Cancel'),
        onClick: () => setCancelling(a),
      });
    if (a.canEdit)
      items.push(
        ...(items.length ? [{ key: 'div', type: 'divider' as const }] : []),
        {
          key: 'delete',
          icon: <Trash2 size={13} />,
          label: t('Delete'),
          danger: true,
          onClick: () => setDeleting(a),
        },
      );
    return items;
  };

  const status = (a: AuditItem) => {
    if (a.isActive)
      return (
        <Tooltip
          title={a.status === 'queued' ? t('Waiting to start') : undefined}
        >
          <span className="m-audits__status">
            <ProgressBar
              value={a.progress}
              label={t('{{name}} is still running', { name: a.name })}
            />
          </span>
        </Tooltip>
      );
    if (a.isFailed)
      return (
        <Tooltip title={a.raw.error || undefined}>
          <span>
            <Chip kind="status" tone="danger">
              {t('Failed')}
            </Chip>
          </span>
        </Tooltip>
      );
    if (a.isCancelled) return <Chip kind="status">{t('Cancelled')}</Chip>;
    return <Chip kind="status">{t('Ready')}</Chip>;
  };

  const whenReady = (a: AuditItem, label: string) =>
    a.isReady ? label : t('Ready when the audit is');

  const actions = (a: AuditItem) => {
    const menu = rowMenu(a);
    const pdf = a.hasArtifact('pdf');
    return (
      <div className="m-audits__artifacts" onClick={(e) => e.stopPropagation()}>
        <Tooltip title={whenReady(a, t('Copy link'))}>
          <span>
            <Button
              variant="subtle"
              size="icon"
              disabled={!a.isReady}
              aria-label={t('Copy link to {{name}}', { name: a.name })}
              onClick={() => copyLink(a)}
            >
              <Link2 size={14} />
            </Button>
          </span>
        </Tooltip>
        <Tooltip
          title={
            a.isReady && !pdf
              ? t('The PDF is not ready yet')
              : whenReady(a, t('Download the PDF'))
          }
        >
          <span>
            <Button
              variant="subtle"
              size="icon"
              disabled={!a.isReady || !pdf}
              aria-label={t('Download the PDF of {{name}}', { name: a.name })}
              onClick={() => artifact.open(a.id, 'pdf', { onError: failed })}
            >
              <Download size={14} />
            </Button>
          </span>
        </Tooltip>
        {menu.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="subtle"
                size="icon"
                aria-label={t('More for {{name}}', { name: a.name })}
              >
                <MoreHorizontal size={15} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems items={menu} />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="m-audits__spacer" aria-hidden="true" />
        )}
      </div>
    );
  };

  const columnIf = (
    field: AuditFieldKey,
    column: Column<AuditItem>,
  ): Column<AuditItem>[] => (ui.hasField(field) ? [column] : []);

  const columns: Column<AuditItem>[] = [
    {
      title: t('Audit'),
      key: 'name',
      width: '44%',
      render: (a) => (
        <div className="m-audits__name-cell">
          <span className="m-audits__name m-truncate">{a.name}</span>
          <span className="m-audits__scope m-truncate">{a.scopeLabel}</span>
        </div>
      ),
    },
    ...columnIf('sessions', {
      title: t('Sessions'),
      key: 'sessions',
      width: '17%',
      render: (a) =>
        a.sessions == null ? (
          <span className="m-audits__none">—</span>
        ) : (
          <span className="m-audits__count">
            <span className="num">{fmt(a.sessions)}</span>
            {t('sessions')}
          </span>
        ),
    }),
    ...columnIf('status', {
      title: t('Status'),
      key: 'status',
      width: '12%',
      render: status,
    }),
    ...columnIf('created', {
      title: t('Created'),
      key: 'created',
      width: '15%',
      render: (a) => (
        <span className="m-audits__by">
          <span className="m-truncate">
            {a.isMine(me) ? t('You') : a.raw.userName || '—'}
          </span>
          <span className="m-audits__dot" aria-hidden="true">
            ·
          </span>
          <RelativeTime at={a.createdAt} />
        </span>
      ),
    }),
    {
      title: '',
      key: 'actions',
      width: '12%',
      align: 'right',
      render: actions,
    },
  ];

  const tabCount = (key: AuditTab) => counts.data?.[key];
  const statusStrip: FilterStripProps = {
    label: t('Filter by status'),
    items: [
      { key: 'all', label: t('All'), count: tabCount('all') },
      { key: 'running', label: t('Running'), count: tabCount('running') },
      { key: 'ready', label: t('Ready'), count: tabCount('ready') },
    ],
    selected: [ui.tab],
    onSelect: (key) => ui.setTab(key as AuditTab),
  };

  const resetAll = () => {
    ui.showAll();
    ui.resetDisplay();
    setQuery('');
  };

  const firstRun = (
    <EmptyState
      art="audit"
      title={t('No audits yet')}
      hint={t(
        'An audit turns a period of your sessions into a report you can present: traffic, usage, errors and speed, friction, retention, and with AI, the journeys people take and the issues that stop them.',
      )}
      action={
        <Button onClick={newAudit}>
          <Plus size={14} />
          {t('New audit')}
        </Button>
      }
    >
      <StartPath
        steps={[
          {
            icon: <Split />,
            label: t('Pick the traffic and the days'),
            hint: t('All of it, a segment or a filter'),
          },
          {
            icon: <ScanSearch />,
            label: t('It reads every session'),
            hint: t('And AI reads a sample for journeys'),
          },
          {
            icon: <FileText />,
            label: t('Present the report'),
            hint: t('Slides, a link and a PDF'),
          },
        ]}
      />
    </EmptyState>
  );

  const noMatch = (
    <EmptyState
      state={ui.search ? 'audits-nomatch' : 'audits-tab'}
      title={ui.search ? t('No audits match your search') : t('No audits here')}
      hint={t('Clear the search, or pick another tab or period.')}
      action={
        <Button
          onClick={() => {
            ui.showAll();
            setQuery('');
          }}
        >
          {t('Show all audits')}
        </Button>
      }
    />
  );

  const body = () => {
    if (list.isPending || ever.isPending) return <SkeletonRows rows={4} />;
    if (list.isError)
      return (
        <EmptyState
          art="audit"
          title={t('Audits could not be loaded')}
          hint={list.error.message}
          action={
            <Button onClick={() => void list.refetch()}>{t('Retry')}</Button>
          }
        />
      );
    if (ever.data?.all === 0) return firstRun;
    if (!items?.length) return noMatch;
    return (
      <>
        <DataTable<AuditItem>
          className="m-audits__table"
          ariaLabel={t('Audits')}
          columns={columns}
          rows={items}
          rowKey={(a) => a.id}
          stickyHeader
          rowClassName={() => 'm-audits__row'}
          onRowClick={openReport}
        />
        <ListFooter
          fit="audits"
          page={ui.page}
          pageSize={pageSize}
          total={total}
          noun={(count, n) => t('{{n}} audits', { count, n })}
          onPage={ui.setPage}
          onPageSize={(n) => {
            setRowsPerPage(n);
            ui.setPage(1);
          }}
        />
      </>
    );
  };

  return (
    <PageCard
      title={t('Audits')}
      subtitle={t(
        'Reports on your traffic, usage, errors and friction, made from your sessions to present or share.',
      )}
      actions={
        <>
          <SearchField
            placeholder={t('Search audits')}
            value={query}
            onChange={setQuery}
          />
          <Button variant="primary" onClick={newAudit}>
            <Plus size={14} />
            {t('New audit')}
          </Button>
        </>
      }
      toolbar={
        <>
          <FilterStrip {...statusStrip} folds="menu" />
          <div className="m-page__controls">
            <PhoneFilters
              result={t('Show {{n}} audits', {
                count: total,
                n: fmt(total),
              })}
              onReset={resetAll}
            >
              <DateRange
                field={t('Created')}
                resting={LAST_30_DAYS}
                period={ui.period}
                onChange={ui.setPeriod}
              />
              <AuditsFilterMenu />
              <DisplayShell
                strip={statusStrip}
                label={t('Display audits')}
                changeCount={ui.displayChanges}
                onReset={ui.resetDisplay}
                fields={AUDIT_FIELD_CHOICES.map((f) => ({
                  value: f.value,
                  label: t(f.label),
                  on: ui.hasField(f.value),
                }))}
                onToggleField={(v) => ui.toggleField(v as AuditFieldKey)}
                rows={[
                  {
                    id: 'ad-sort',
                    label: t('Ordering'),
                    control: (
                      <MenuSelect<AuditSortKey>
                        id="ad-sort"
                        value={ui.sort}
                        choices={AUDIT_SORT_CHOICES.map((c) => ({
                          value: c.value,
                          label: t(c.label),
                        }))}
                        onChange={ui.setSort}
                      />
                    ),
                  },
                ]}
              />
            </PhoneFilters>
          </div>
        </>
      }
    >
      {body()}

      <NewAuditDrawer
        key={draftKey}
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          ui.showAll();
          setQuery('');
        }}
      />
      <RenameDialog
        open={renaming != null}
        title={t('Rename audit')}
        value={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={(name) => {
          if (renaming)
            rename.mutate({ auditId: renaming.id, name }, { onError: failed });
          setRenaming(null);
        }}
      />
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete this audit?')}
        okText={t('Delete')}
        onCancel={() => setDeleting(null)}
        onOk={() => {
          if (deleting)
            remove.mutate(deleting.id, {
              onSuccess: () => toast.success(t('Audit deleted')),
              onError: failed,
            });
          setDeleting(null);
        }}
      >
        {deleting?.isActive
          ? t(
              '“{{name}}” is still running. It stops and is removed from the list.',
              {
                name: deleting?.name,
              },
            )
          : t('“{{name}}” and its report will be removed.', {
              name: deleting?.name,
            })}
      </ConfirmDialog>
      <ConfirmDialog
        open={cancelling != null}
        title={t('Cancel this audit?')}
        okText={t('Cancel audit')}
        cancelText={t('Keep running')}
        onCancel={() => setCancelling(null)}
        onOk={() => {
          if (cancelling) cancel.mutate(cancelling.id, { onError: failed });
          setCancelling(null);
        }}
      >
        {t(
          '“{{name}}” stops and makes no report. You can run it again later.',
          {
            name: cancelling?.name,
          },
        )}
      </ConfirmDialog>
    </PageCard>
  );
}

export default withPermissions(['AUDITS'])(
  withPageTitle('Audits')(observer(AuditsPage)),
);

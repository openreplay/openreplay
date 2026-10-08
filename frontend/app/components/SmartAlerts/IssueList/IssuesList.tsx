import withPageTitle from '@/components/hocs/withPageTitle';
import withPermissions from '@/components/hocs/withPermissions';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { Chip } from '@/ui/data/Chip';
import { MoreCount } from '@/ui/data/MoreCount';
import { type Column, DataTable, type TableSort } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { ActiveFilters } from '@/ui/filters/ActiveFilters';
import { DisplayShell } from '@/ui/filters/DisplayMenu';
import { type FilterDimension, FilterMenu } from '@/ui/filters/FilterMenu';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { DateRange } from '@/ui/inputs/DateRange';
import { SearchField } from '@/ui/inputs/SearchField';
import { Switch } from '@/ui/inputs/switch';
import { Segmented } from '@/ui/inputs/toggle-group';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard } from '@/ui/layout/PageCard';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import {
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Code2,
  Eye,
  EyeOff,
  Flag,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  Radio,
  RotateCcw,
  Settings2,
  Split,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { useHistory } from 'App/routing';
import { smartIssueDetails, withSiteId } from 'App/saasComponents';
import { OriginBadge } from 'Components/SmartAlerts/shared/OriginBadge';

import { StartPath } from 'Shared/StartPath/StartPath';

import SegmentsIndicator from '../segments/SegmentsIndicator';
import {
  CAT_ICON,
  CAT_ORDER,
  type CategoryName,
  CriticalDialog,
  CriticalToggle,
  HideIssueModal,
  ImpactGauge,
  type Issue,
  NotCriticalDialog,
  RenameIssueModal,
  TagDialog,
  lastSeenExact,
  lastSeenLabel,
} from '../shared';
import type { MatchMode } from '../shared/model';
import './issues-page.css';

type FilterKey = 'tags' | 'origins';
const FULL = '__full__';
const MINE = '__mine__';

function IssuesList() {
  const { issuesStore, projectsStore } = useStore();
  const { t } = useTranslation();
  const toast = useToast();
  const siteId = projectsStore.activeSiteId;
  const history = useHistory();
  const [hideTarget, setHideTarget] = React.useState<Issue | null>(null);
  const [critTarget, setCritTarget] = React.useState<Issue | null>(null);
  const [notCritTarget, setNotCritTarget] = React.useState<Issue | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<Issue | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<Issue | null>(null);
  const [creatingTag, setCreatingTag] = React.useState(false);
  const [period, setPeriod] = React.useState<any>(() =>
    Period({ rangeName: LAST_7_DAYS }),
  );

  React.useEffect(() => {
    if (siteId) issuesStore.init(String(siteId));
  }, [siteId]);

  React.useEffect(() => {
    if (
      !issuesStore.loading &&
      issuesStore.total === 0 &&
      issuesStore.hasActiveFilters
    )
      void issuesStore.fetchUnfilteredTotal();
  }, [issuesStore.loading, issuesStore.total, issuesStore.hasActiveFilters]);

  const resetFilters = () => {
    setPeriod(Period({ rangeName: LAST_7_DAYS }));
    issuesStore.resetFilters();
  };
  const openDetail = (id: string) =>
    history.push(withSiteId(smartIssueDetails(encodeURIComponent(id)), siteId));

  const { visibility } = issuesStore;
  const showHidden = visibility === 'hidden' || visibility === 'all';
  const showDeleted = visibility === 'deleted' || visibility === 'all';
  const applyVisibility = (hidden: boolean, deleted: boolean) =>
    issuesStore.setVisibility(
      hidden && deleted
        ? 'all'
        : hidden
          ? 'hidden'
          : deleted
            ? 'deleted'
            : 'active',
    );
  const showLastSeen = issuesStore.list.some((i) => i.seenAgoMin != null);

  /* ── filters ── */
  const segments = issuesStore.originSegments;
  const myIds = segments.filter((s) => s.mine).map((s) => s.id);
  const mineOn =
    myIds.length > 0 && myIds.every((id) => issuesStore.origins.includes(id));
  const matchSwitch = (value: MatchMode, onChange: (m: MatchMode) => void) => (
    <>
      <span>{t('Match')}</span>
      <Segmented
        value={value}
        onChange={(v) => onChange(v as MatchMode)}
        ariaLabel={t('Match')}
        options={[
          { value: 'any', label: t('Any') },
          { value: 'all', label: t('All') },
        ]}
      />
    </>
  );
  const dimensions: FilterDimension<FilterKey>[] = [
    {
      key: 'tags',
      label: t('Tags'),
      icon: <TagIcon size={14} />,
      options: issuesStore.allTags.map((tag) => ({ value: tag, label: tag })),
      footer: (
        <>
          <Button variant="subtle" onClick={() => setCreatingTag(true)}>
            <Plus size={13} />
            {t('New tag')}
          </Button>
          <span className="inline-flex items-center gap-2">
            {matchSwitch(issuesStore.match, issuesStore.setMatch)}
          </span>
        </>
      ),
    },
    {
      key: 'origins',
      label: t('Found in'),
      icon: <Split size={14} />,
      options: [
        { value: FULL, label: t('Full traffic'), icon: <Globe size={13} /> },
        ...(myIds.length
          ? [
              {
                value: MINE,
                label: t('My segments'),
                icon: <Split size={13} />,
              },
            ]
          : []),
        ...segments.map((s) => ({
          value: s.id,
          label: s.name,
          icon: <Split size={13} />,
        })),
      ],
      footer:
        issuesStore.origins.length > 1 ? (
          <span className="ml-auto inline-flex items-center gap-2">
            {matchSwitch(
              issuesStore.segmentsMatch,
              issuesStore.setSegmentsMatch,
            )}
          </span>
        ) : undefined,
    },
  ];
  const isActive = (key: FilterKey, value: string) => {
    if (key === 'tags') return issuesStore.labels.includes(value);
    if (value === MINE) return mineOn;
    if (value === FULL) return issuesStore.origins.includes('full');
    return issuesStore.origins.includes(value);
  };
  const onToggle = (key: FilterKey, value: string) => {
    if (key === 'tags') return issuesStore.toggleLabel(value);
    if (value === MINE)
      return issuesStore.setOrigins(
        mineOn
          ? issuesStore.origins.filter((o) => !myIds.includes(o))
          : [
              ...issuesStore.origins,
              ...myIds.filter((id) => !issuesStore.origins.includes(id)),
            ],
      );
    return issuesStore.toggleOrigin(value === FULL ? 'full' : value);
  };
  const chips = [
    ...issuesStore.labels.map((l) => ({
      key: 'tags' as FilterKey,
      value: l,
      dimension: t('Tag'),
      label: l,
    })),
    ...issuesStore.origins.map((o) => ({
      key: 'origins' as FilterKey,
      value: o === 'full' ? FULL : String(o),
      dimension: t('Found in'),
      label:
        o === 'full'
          ? t('Full traffic')
          : issuesStore.segmentName(o) || String(o),
    })),
  ];

  /* ── sort ── */
  const tableSort: TableSort | null = issuesStore.sortTouched
    ? issuesStore.sort === 'impact'
      ? { key: 'impact', desc: issuesStore.sortDir === 'desc' }
      : issuesStore.sort === 'recency'
        ? { key: 'seen', desc: issuesStore.sortDir === 'desc' }
        : null
    : null;
  const onSort = (key: string | null, desc: boolean) =>
    key
      ? issuesStore.setSortState(
          key === 'seen' ? 'recency' : 'impact',
          desc ? 'desc' : 'asc',
        )
      : issuesStore.setSortState('impact', 'desc');

  const columns: Column<Issue>[] = [
    {
      title: t('Impact'),
      key: 'impact',
      width: 96,
      sortable: true,
      render: (r) => <ImpactGauge value={r.impact} label />,
    },
    {
      title: t('Issue'),
      key: 'head',
      render: (r) => (
        <div className="m-issues__title-cell">
          <CriticalToggle
            state={
              issuesStore.notCritical[r.id] != null
                ? 'dismissed'
                : issuesStore.critState(r.id)
            }
            matchedBy={
              issuesStore.matchedRules(r.id).find((x) => !x.mine)?.createdBy
            }
            onOpen={() => setCritTarget(r)}
            stopPropagation
          />
          <span className="m-issues__title m-truncate">{r.head}</span>
          {r.hidden && (
            <Chip kind="status" tone="neutral">
              {t('Hidden')}
            </Chip>
          )}
          {r.deleted && (
            <Chip kind="status" tone="danger">
              {t('Deleted')}
            </Chip>
          )}
        </div>
      ),
    },
    {
      title: t('Tags'),
      key: 'tags',
      width: 240,
      render: (r) => {
        const tags = r.journeyLabels ?? [];
        const names = r.segmentIds
          .map((id) => issuesStore.segmentName(id))
          .filter(Boolean);
        const showOrigin =
          r.segmentIds.length > 0 || issuesStore.segments.length > 0;
        return (
          <div className="m-issues__tags">
            {showOrigin && (
              <OriginBadge
                segmentName={
                  r.segmentIds.length
                    ? names.join(', ') || r.segmentIds.join(', ')
                    : undefined
                }
              />
            )}
            {tags.slice(0, 1).map((tag) => (
              <Chip key={tag} kind="tag">
                {tag}
              </Chip>
            ))}
            <MoreCount hidden={tags.slice(1)} />
          </div>
        );
      },
    },
    ...(showLastSeen
      ? [
          {
            title: t('Last seen'),
            key: 'seen',
            width: 120,
            sortable: true,
            render: (r: Issue) =>
              r.seenAgoMin == null ? null : (
                <Tooltip title={lastSeenExact(r.seenAgoMin)} delay={200}>
                  <span className="text-xs text-content-muted tabular-nums">
                    {lastSeenLabel(r.seenAgoMin)}
                  </span>
                </Tooltip>
              ),
          },
        ]
      : []),
    {
      title: '',
      key: 'actions',
      width: 48,
      align: 'center',
      render: (r) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <span>
              <IconButton
                icon={<MoreHorizontal size={15} />}
                label={t('Actions for {{name}}', { name: r.head })}
                variant="ghost"
              />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItems
              items={
                r.deleted
                  ? [
                      {
                        key: 'open',
                        icon: <ArrowUpRight size={13} />,
                        label: t('Open'),
                        onClick: () => openDetail(r.id),
                      },
                      {
                        key: 'restore',
                        icon: <RotateCcw size={13} />,
                        label: t('Restore'),
                        onClick: () => issuesStore.restore(r.id),
                      },
                    ]
                  : [
                      {
                        key: 'open',
                        icon: <ArrowUpRight size={13} />,
                        label: t('Open'),
                        onClick: () => openDetail(r.id),
                      },
                      {
                        key: 'rename',
                        icon: <Pencil size={13} />,
                        label: t('Rename'),
                        onClick: () => setRenameTarget(r),
                      },
                      ...(issuesStore.notCritical[r.id] != null
                        ? [
                            {
                              key: 'restoreCritical',
                              icon: <AlertTriangle size={13} />,
                              label: t('Show as critical again'),
                              onClick: () => issuesStore.restoreCritical(r.id),
                            },
                          ]
                        : issuesStore.critState(r.id) !== 'none'
                          ? [
                              {
                                key: 'notCritical',
                                icon: <AlertTriangle size={13} />,
                                label: t('Not critical for me'),
                                onClick: () => setNotCritTarget(r),
                              },
                            ]
                          : []),
                      { key: 'd1', type: 'divider' as const },
                      r.hidden
                        ? {
                            key: 'unhide',
                            icon: <Eye size={13} />,
                            label: t('Unhide'),
                            onClick: () => issuesStore.unhide(r.id),
                          }
                        : {
                            key: 'hide',
                            icon: <EyeOff size={13} />,
                            label: t('Hide'),
                            onClick: () => setHideTarget(r),
                          },
                      {
                        key: 'delete',
                        icon: <Trash2 size={13} />,
                        label: t('Delete'),
                        danger: true,
                        onClick: () => setDeleteTarget(r),
                      },
                    ]
              }
            />
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const displayChanges =
    (issuesStore.critOnly ? 1 : 0) +
    (showHidden ? 1 : 0) +
    (showDeleted ? 1 : 0) +
    (issuesStore.relevantToMe ? 1 : 0);
  const toggleRow = (
    id: string,
    label: React.ReactNode,
    on: boolean,
    set: (v: boolean) => void,
  ) => ({
    id,
    label: label as string,
    control: <Switch id={id} checked={on} onCheckedChange={set} />,
  });

  const empty = issuesStore.hasActiveFilters ? (
    <EmptyState
      art="search"
      title={
        issuesStore.relevantToMe
          ? t('Nothing is critical to you yet')
          : t('No issues match these filters')
      }
      hint={
        issuesStore.relevantToMe
          ? t(
              'Mark issues critical for you, or create a traffic segment, and they show up here.',
            )
          : t('Clear them to see the whole list again.')
      }
      action={
        <Button onClick={resetFilters}>
          {issuesStore.unfilteredTotal
            ? t('Reset filters to show {{n}} issues', {
                n: issuesStore.unfilteredTotal,
              })
            : t('Reset filters')}
        </Button>
      }
    />
  ) : (
    <EmptyState
      art="issues"
      title={t('No issues found yet')}
      hint={t(
        'The agent reads sessions for errors, dead ends and slowness, and writes up what it finds. The first finding usually lands within a day.',
      )}
    >
      <StartPath
        steps={[
          {
            icon: <Code2 />,
            label: t('Install the tracker'),
            hint: t('Once, in your app'),
          },
          {
            icon: <Radio />,
            label: t('Sessions come in'),
            hint: t('The agent reads each one'),
          },
          {
            icon: <Flag />,
            label: t('Findings land here'),
            hint: t('Ranked by who they hit'),
          },
        ]}
      />
    </EmptyState>
  );

  const hasCounts = issuesStore.hasCategoryCounts;
  const catSelected =
    issuesStore.cats.length === 1 ? issuesStore.cats[0] : 'all';

  return (
    <PageCard
      title={t('Issues')}
      subtitle={t(
        'Problems the agent found across sessions, ranked by how many users they affect.',
      )}
      actions={
        <>
          <SearchField
            placeholder={t('Search issues')}
            value={issuesStore.query}
            onChange={(v) => issuesStore.setQuery(v)}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span>
                <IconButton
                  icon={<MoreHorizontal size={15} />}
                  label={t('More')}
                  variant="ghost"
                />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={[
                  {
                    key: 'settings',
                    icon: <Settings2 size={13} />,
                    label: t('Issues settings'),
                    onClick: () => history.push('/client/agents?agent=issues'),
                  },
                  {
                    key: 'docs',
                    icon: <BookOpen size={13} />,
                    label: t('Documentation'),
                    onClick: () =>
                      window.open('https://docs.openreplay.com/', '_blank'),
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
      toolbar={
        <>
          {issuesStore.hasCategories ? (
            <FilterStrip
              label={t('Filter by category')}
              items={[
                {
                  key: 'all',
                  label: t('All'),
                  count: hasCounts ? issuesStore.allCategoryCount : undefined,
                },
                ...CAT_ORDER.map((c) => {
                  const Icon = CAT_ICON[c];
                  return {
                    key: c,
                    label: t(c),
                    count: hasCounts ? issuesStore.catCount(c) : undefined,
                    icon: <Icon size={13} aria-hidden="true" />,
                  };
                }),
              ]}
              selected={[catSelected]}
              onSelect={(key) =>
                issuesStore.setCats(
                  key === 'all' || key === catSelected
                    ? []
                    : [key as CategoryName],
                )
              }
            />
          ) : null}
          <div className="m-page__controls">
            <SegmentsIndicator />
            <DateRange
              field={t('Last seen')}
              period={period}
              onChange={(p: any) => {
                setPeriod(p);
                issuesStore.setRange([p.start, p.end]);
              }}
            />
            <FilterMenu<FilterKey>
              dimensions={dimensions}
              isActive={isActive}
              onToggle={onToggle}
              activeCount={chips.length}
            />
            <DisplayShell
              changeCount={displayChanges}
              onReset={() => {
                issuesStore.setCritOnly(false);
                issuesStore.setRelevantToMe(false);
                applyVisibility(false, false);
              }}
              rows={[
                toggleRow(
                  'iss-crit',
                  t('Critical only'),
                  issuesStore.critOnly,
                  (v) => issuesStore.setCritOnly(v),
                ),
                toggleRow(
                  'iss-mine',
                  issuesStore.relevantCount
                    ? t('Critical to me · {{n}}', {
                        n: issuesStore.relevantCount,
                      })
                    : t('Critical to me'),
                  issuesStore.relevantToMe,
                  (v) => issuesStore.setRelevantToMe(v),
                ),
                toggleRow('iss-hidden', t('Show hidden'), showHidden, (v) =>
                  applyVisibility(v, showDeleted),
                ),
                toggleRow('iss-deleted', t('Show deleted'), showDeleted, (v) =>
                  applyVisibility(showHidden, v),
                ),
              ]}
            />
          </div>
        </>
      }
    >
      <ActiveFilters<FilterKey>
        chips={chips}
        onRemove={onToggle}
        onClearAll={() => {
          issuesStore.setLabels([]);
          issuesStore.clearOrigins();
        }}
        resultCount={issuesStore.total}
        noun={[t('issue'), t('issues')]}
      />
      {issuesStore.loading && issuesStore.list.length === 0 ? (
        <SkeletonRows rows={6} columns={[10, 50, 25, 10, 5]} />
      ) : issuesStore.list.length === 0 ? (
        empty
      ) : (
        <>
          <DataTable<Issue>
            className="m-issues__table"
            rowKey={(r) => r.id}
            columns={columns}
            rows={issuesStore.list}
            sort={tableSort}
            onSort={onSort}
            rowClassName={(r) =>
              r.hidden || r.deleted ? 'is-hidden-row' : undefined
            }
            onRowClick={(r) => openDetail(r.id)}
            ariaLabel={t('Issues')}
          />
          <ListFooter
            page={issuesStore.page}
            pageSize={issuesStore.limit}
            total={issuesStore.total}
            noun={[t('issue'), t('issues')]}
            onPage={(p) => issuesStore.setPage(p)}
          />
        </>
      )}

      <HideIssueModal
        open={hideTarget != null}
        head={hideTarget?.head}
        reasons={issuesStore.reasons.hide}
        onCancel={() => setHideTarget(null)}
        onConfirm={(reasons, note) => {
          if (hideTarget) issuesStore.hide(hideTarget.id, reasons, note);
          setHideTarget(null);
        }}
      />
      <RenameIssueModal
        open={renameTarget != null}
        initial={renameTarget?.head ?? ''}
        onCancel={() => setRenameTarget(null)}
        onConfirm={(name) => {
          if (renameTarget) issuesStore.rename(renameTarget.id, name);
          setRenameTarget(null);
        }}
      />
      <CriticalDialog
        issueId={critTarget?.id ?? null}
        issueHead={critTarget?.head ?? ''}
        onClose={() => setCritTarget(null)}
      />
      <NotCriticalDialog
        issue={notCritTarget}
        reasons={issuesStore.reasons.criticality}
        onClose={() => setNotCritTarget(null)}
      />
      <TagDialog
        open={creatingTag}
        onCancel={() => setCreatingTag(false)}
        onSave={(name, description) => {
          if (issuesStore.addCustomTag(name, description) === false) {
            toast.error(t('A tag with that name already exists.'));
            return;
          }
          toast.success(
            t('Tag created. The agent starts applying it to new sessions.'),
          );
          setCreatingTag(false);
        }}
      />
      <ConfirmDialog
        open={deleteTarget != null}
        title={t('Delete this issue?')}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleteTarget(null)}
        onOk={() => {
          if (deleteTarget) void issuesStore.remove(deleteTarget.id);
          setDeleteTarget(null);
        }}
      >
        {t('“{{head}}” will be removed from the list.', {
          head: deleteTarget?.head,
        })}
      </ConfirmDialog>
    </PageCard>
  );
}

export default withPermissions(['SMART_ISSUES'])(
  withPageTitle('Smart Issues')(observer(IssuesList)),
);

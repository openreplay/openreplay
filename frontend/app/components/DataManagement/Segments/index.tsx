import { Button } from '@/ui/actions/button';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DisplayShell, MenuSelect } from '@/ui/filters/DisplayMenu';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { SearchField } from '@/ui/inputs/SearchField';
import { Switch } from '@/ui/inputs/switch';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import withPermissions from 'HOCs/withPermissions';
import { Layers, Plus, UserRound, Users } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import type { SavedSegment } from 'App/components/SmartAlerts/api';
import SegmentDrawer from 'App/components/SmartAlerts/segments/SegmentDrawer';
import { useStore } from 'App/mstore';
import { sessions, withSiteId } from 'App/routes';
import { useHistory, useParams } from 'App/routing';
import { agentIssuesEnabled } from 'App/utils/split-utils';

import { describeRules, viewOf } from 'Shared/FilterEditor';

import { type Segment, mapSegments } from './api';
import './segments-panel.css';

type Owner = 'all' | 'mine' | 'shared';
type SegSort = 'updatedAt' | 'name' | 'sessionsCount';
type SegField = 'count' | 'users' | 'owner' | 'updated';
const ALL_FIELDS: SegField[] = ['count', 'users', 'owner', 'updated'];
const PAGE = 10;

const compact = Intl.NumberFormat('en-US', {
  notation: 'compact',
  compactDisplay: 'short',
});

function SegmentsListPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const history = useHistory();
  const queryClient = useQueryClient();
  const { projectsStore, issuesStore, searchStore, userStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const showAgent = agentIssuesEnabled() && issuesStore.agentAvailable === true;
  const accountId = Number(userStore.account.id);

  const [owner, setOwner] = React.useState<Owner>('all');
  const [sort, setSort] = React.useState<SegSort>('updatedAt');
  const [fields, setFields] = React.useState<SegField[]>(ALL_FIELDS);
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SavedSegment | null>(null);
  const { segmentId } = useParams<{ segmentId?: string }>();

  React.useEffect(() => {
    if (siteId) issuesStore.ensureSegments(String(siteId));
  }, [siteId]);

  const { data: all = [], isPending } = useQuery({
    queryKey: ['segments-list', siteId],
    queryFn: async () => {
      await searchStore.ensureSavedSearchList(true);
      return mapSegments(searchStore.savedSearchRaw);
    },
  });

  const isMine = (s: Segment) =>
    issuesStore.segmentById(s.id)?.mine ?? s.userId === accountId;
  const ownedBy = (s: Segment, who: Owner) =>
    who === 'all' ? true : who === 'mine' ? isMine(s) : s.isPublic;

  const shown = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const kept = all.filter(
      (s) => ownedBy(s, owner) && (!q || s.name.toLowerCase().includes(q)),
    );
    return [...kept].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : (b[sort] ?? 0) - (a[sort] ?? 0),
    );
  }, [all, owner, sort, query]);
  const pageRows = shown.slice((page - 1) * PAGE, page * PAGE);
  const has = (f: SegField) => fields.includes(f);

  const toSaved = (s: Segment): SavedSegment =>
    issuesStore.segmentById(s.id) ??
    ({
      id: s.id,
      name: s.name,
      isPublic: s.isPublic,
      mine: isMine(s),
      createdBy: s.userName,
      filters: s.filters,
      summary: '',
      sessionsCount: s.sessionsCount,
      usersCount: s.usersCount,
      totalSessionCount: s.totalSessionCount,
      updatedAt: s.updatedAt,
      active: s.isCapture,
      trafficPct: s.trafficPct,
      sessionsPerDay: s.sessionsPerDay,
    } as SavedSegment);

  // a deep link opens its segment once (the list may arrive after the URL);
  // later list changes must not reopen it over the user's work
  const openedFor = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!segmentId || openedFor.current === segmentId) return;
    const hit = all.find((s) => s.id === segmentId);
    if (!hit) return;
    openedFor.current = segmentId;
    openSegment(hit);
  }, [segmentId, all.length]);

  const openSegment = (s: Segment) => {
    setEditing(toSaved(s));
    setDrawerOpen(true);
  };
  const create = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const use = (s: Segment) => {
    const saved = searchStore.list.find((x) => String(x.searchId) === s.id);
    if (!saved) return;
    searchStore.applySavedSearch(saved);
    history.push(withSiteId(sessions(), siteId!));
  };

  const rules = (s: Segment) => {
    const views = s.filters.map((f, i) => viewOf(f as any, String(i)));
    return describeRules(
      t,
      views.filter((v) => v.isEvent),
      views.filter((v) => !v.isEvent),
      'then',
    );
  };

  const columns: Column<Segment>[] = [
    {
      title: t('Segment'),
      key: 'name',
      render: (s) => (
        <div className="m-segs__cell">
          <span className="m-segs__name m-truncate">{s.name}</span>
          <span className="m-segs__rules m-truncate">{rules(s)}</span>
        </div>
      ),
    },
    ...(has('count')
      ? [
          {
            title: t('Sessions'),
            key: 'count',
            width: 108,
            align: 'right' as const,
            render: (s: Segment) => (
              <span className={`m-segs__n${s.sessionsCount ? '' : ' is-zero'}`}>
                {s.sessionsCount ? compact.format(s.sessionsCount) : '—'}
              </span>
            ),
          },
        ]
      : []),
    ...(has('users')
      ? [
          {
            title: t('Users'),
            key: 'users',
            width: 96,
            align: 'right' as const,
            render: (s: Segment) => (
              <span className={`m-segs__n${s.usersCount ? '' : ' is-zero'}`}>
                {s.usersCount ? compact.format(s.usersCount) : '—'}
              </span>
            ),
          },
        ]
      : []),
    ...(has('owner')
      ? [
          {
            title: t('Owner'),
            key: 'owner',
            width: 168,
            render: (s: Segment) => (
              <span className="m-segs__owner m-truncate">
                {isMine(s) ? t('You') : s.userName || '—'}
                {s.isPublic && (
                  <Tooltip title={t('Shared with the team')}>
                    <span
                      className="m-segs__shared"
                      role="img"
                      aria-label={t('Shared with the team')}
                    >
                      <Users size={12} />
                    </span>
                  </Tooltip>
                )}
              </span>
            ),
          },
        ]
      : []),
    ...(has('updated')
      ? [
          {
            title: t('Updated'),
            key: 'updated',
            width: 104,
            render: (s: Segment) =>
              s.updatedAt ? <RelativeTime at={s.updatedAt} /> : '—',
          },
        ]
      : []),
    ...(showAgent
      ? [
          {
            title: t('Issues Agent'),
            key: 'capture',
            width: 110,
            render: (s: Segment) => {
              const seg = issuesStore.segmentById(s.id);
              if (!seg) return <span className="m-segs__n is-zero">—</span>;
              const control = (
                <Switch
                  checked={seg.active}
                  disabled={!seg.isPublic}
                  aria-label={t('Issues agent for {{name}}', {
                    name: seg.name,
                  })}
                  onCheckedChange={(on) => {
                    if (on) issuesStore.enableCapture(seg.id);
                    else if (issuesStore.toggleSegment(seg.id, false))
                      toast.info(
                        t(
                          'No active segments left. Capture switched to full traffic.',
                        ),
                      );
                  }}
                />
              );
              return seg.isPublic ? (
                control
              ) : (
                <Tooltip
                  title={t(
                    'Private segments can’t enable the agent. Only team-visible ones are eligible.',
                  )}
                >
                  <span>{control}</span>
                </Tooltip>
              );
            },
          },
        ]
      : []),
    {
      title: '',
      key: 'use',
      width: 84,
      align: 'right' as const,
      render: (s: Segment) => (
        <Button variant="subtle" className="m-segs__use" onClick={() => use(s)}>
          {t('Use')}
        </Button>
      ),
    },
  ];

  const ownerTabs: { key: Owner; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: t('All'), icon: <Layers size={13} /> },
    { key: 'mine', label: t('Mine'), icon: <UserRound size={13} /> },
    { key: 'shared', label: t('Team'), icon: <Users size={13} /> },
  ];

  return (
    <PageCard
      title={t('Segments')}
      subtitle={t('Saved searches you can reopen and share.')}
      actions={
        <Button variant="primary" onClick={create}>
          <Plus size={13} />
          {t('New segment')}
        </Button>
      }
      split
    >
      <PagePanel
        head={
          <>
            <FilterStrip
              label={t('Whose segments')}
              items={ownerTabs.map((o) => ({
                key: o.key,
                label: o.label,
                icon: o.icon,
                count: all.filter((s) => ownedBy(s, o.key)).length,
              }))}
              selected={[owner]}
              onSelect={(k) => {
                setOwner(k as Owner);
                setPage(1);
              }}
            />
            <div className="m-page__controls">
              <SearchField
                value={query}
                onChange={(v) => {
                  setQuery(v);
                  setPage(1);
                }}
                placeholder={t('Filter by name')}
              />
              <DisplayShell
                label={t('Display segments')}
                changeCount={
                  (sort === 'updatedAt' ? 0 : 1) +
                  (fields.length === ALL_FIELDS.length ? 0 : 1)
                }
                onReset={() => {
                  setSort('updatedAt');
                  setFields(ALL_FIELDS);
                }}
                rows={[
                  {
                    id: 'seg-sort',
                    label: t('Order'),
                    control: (
                      <MenuSelect<SegSort>
                        id="seg-sort"
                        value={sort}
                        choices={[
                          { value: 'updatedAt', label: t('Updated') },
                          { value: 'name', label: t('Name') },
                          { value: 'sessionsCount', label: t('Most sessions') },
                        ]}
                        onChange={setSort}
                      />
                    ),
                  },
                ]}
                fields={[
                  { value: 'count', label: t('Sessions') },
                  { value: 'users', label: t('Users') },
                  { value: 'owner', label: t('Owner') },
                  { value: 'updated', label: t('Updated') },
                ].map((f) => ({ ...f, on: has(f.value as SegField) }))}
                onToggleField={(v) =>
                  setFields((cur) =>
                    cur.includes(v as SegField)
                      ? cur.filter((x) => x !== v)
                      : ALL_FIELDS.filter((x) => x === v || cur.includes(x)),
                  )
                }
              />
            </div>
          </>
        }
      >
        {isPending ? (
          <SkeletonRows rows={6} />
        ) : all.length === 0 ? (
          <EmptyState
            art="search"
            title={t('No saved segments')}
            hint={t(
              'Build a filter on the sessions list and save it. A segment is that search, kept. Come back to it, share it, or drop it into another search.',
            )}
            action={
              <Button onClick={create}>
                <Plus size={14} />
                {t('New segment')}
              </Button>
            }
          />
        ) : (
          <>
            <DataTable<Segment>
              className="m-segs__table"
              ariaLabel={t('Segments')}
              columns={columns}
              rows={pageRows}
              rowKey={(s) => s.id}
              stickyHeader
              rowClassName={() => 'm-segs__row'}
              onRowClick={openSegment}
            />
            <ListFooter
              page={page}
              pageSize={PAGE}
              total={shown.length}
              noun={[t('segment'), t('segments')]}
              onPage={setPage}
            />
          </>
        )}
      </PagePanel>

      <SegmentDrawer
        open={drawerOpen}
        segment={editing}
        source="dm"
        onClose={() => setDrawerOpen(false)}
        onSaved={() =>
          queryClient.invalidateQueries({ queryKey: ['segments-list'] })
        }
      />
    </PageCard>
  );
}

export default withPermissions(
  ['DATA_MANAGEMENT'],
  '',
  false,
  false,
)(observer(SegmentsListPage));

import usePageTitle from '@/hooks/usePageTitle';
import { ExternalArrow } from '@/ui/actions/ExternalLink';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { OpenReplayMark } from '@/ui/brand/OpenReplayMark';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { hueIndexFor } from '@/ui/data/avatar';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { DateRange } from '@/ui/inputs/DateRange';
import { SearchField } from '@/ui/inputs/SearchField';
import { LargerScreenOnly } from '@/ui/layout/LargerScreenOnly';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { setRowsPerPage, useRowsPerPage } from '@/ui/layout/rows-per-page';
import { Tabs, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { useViewport } from '@/ui/layout/use-viewport';
import Period, { LAST_7_DAYS } from 'Types/app/period';
import { FilterKey } from 'Types/filter/filterType';
import type Session from 'Types/session';
import {
  ChartColumn,
  Globe,
  Headset,
  MoreHorizontal,
  Pencil,
  Plug,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { useModal } from 'App/components/Modal';
import { useStore } from 'App/mstore';
import { liveSession, withSiteId } from 'App/routes';
import { useHistory } from 'App/routing';
import type { IRecord } from 'App/services/RecordingsService';
import { debounce } from 'App/utils';
import { MODULES } from 'Components/Client/Modules/extra';

import {
  EntryField,
  FilterBar,
  buildFilterEditor,
  liveSearchTarget,
  useCatalogue,
} from 'Shared/FilterEditor';
import {
  type ColumnSort,
  type SessionField,
  SessionsTable,
  formatDuration,
} from 'Shared/SessionsTable/SessionsTable';
import { StartPath } from 'Shared/StartPath/StartPath';

import RecordingDialogs from './RecordingDialogs';
import RecordingPlayer from './RecordingPlayer';
import './cobrowse-page.css';

// jspdf, html2canvas and echarts: only when the stats drawer opens
const AssistStats = React.lazy(() => import('Components/AssistStats'));

const AUTOREFRESH_INTERVAL = 2 * 60 * 1000;
/* The picker drawer is narrower than the page: the person, when and how long. */
const PICKER_FIELDS: readonly SessionField[] = [
  'started',
  'duration',
  'device',
];
const LIVE_FIELDS: readonly SessionField[] = [
  'metadata',
  'started',
  'duration',
  'location',
  'device',
];
const LIVE_KEYS = [
  'userid',
  'usercountry',
  'usercity',
  'userstate',
  'useranonymousid',
  'userbrowser',
  'useros',
  'userdevice',
  'platform',
  'utm_medium',
  'utm_source',
  'utm_campaign',
];

type Section = 'live' | 'recordings';

function CoBrowsePage() {
  usePageTitle('Co-Browse - OpenReplay');
  const { t } = useTranslation();
  const phone = useViewport() === 'phone';
  const { userStore, recordingsStore } = useStore();
  const { showModal } = useModal();
  const [section, setSection] = React.useState<Section>('live');
  // the call player is the page's own state: leaving CoBrowse closes it
  React.useEffect(() => () => recordingsStore.openRecording(null), []);
  const modules = userStore.account.settings?.modules ?? [];
  const { isEnterprise } = userStore;
  const hasRecordings =
    isEnterprise && !modules.includes(MODULES.OFFLINE_RECORDINGS);
  const hasReports =
    isEnterprise &&
    userStore.isAdmin &&
    !modules.includes(MODULES.ASSIST_STATS) &&
    !modules.includes(MODULES.ASSIST);

  if (recordingsStore.openRecord)
    return <RecordingPlayer record={recordingsStore.openRecord} />;

  if (phone)
    return (
      <PageCard title={t('CoBrowse')}>
        <LargerScreenOnly what={t('CoBrowse')} art="cobrowse" />
      </PageCard>
    );

  return (
    <PageCard
      title={t('CoBrowse')}
      subtitle={t('Live sessions you can join, and past calls.')}
      tabs={
        hasRecordings ? (
          <Tabs value={section} onValueChange={(k) => setSection(k as Section)}>
            <TabsList
              aria-label={t('Sections of CoBrowse')}
              className="border-b-0"
            >
              <TabsTrigger value="live">{t('Live')}</TabsTrigger>
              <TabsTrigger value="recordings">{t('Recordings')}</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : undefined
      }
      actions={
        hasReports ? (
          <Button
            onClick={() =>
              showModal(
                <React.Suspense fallback={null}>
                  <AssistStats />
                </React.Suspense>,
                { right: true, width: 960 },
              )
            }
          >
            <ChartColumn size={13} />
            {t('Co-browsing reports')}
          </Button>
        ) : undefined
      }
      split
    >
      {section === 'live' ? <LiveSection /> : <RecordingsSection />}
    </PageCard>
  );
}

/** The live list; also the multiview picker (`onPick` + `isPicked`). */
interface LiveSectionProps {
  onPick?: (s: Session) => void;
  isPicked?: (s: Session) => boolean;
}
export const LiveSection = observer(
  ({ onPick, isPicked }: LiveSectionProps) => {
    const { t } = useTranslation();
    const history = useHistory();
    const { searchStoreLive, sessionStore, filterStore, projectsStore } =
      useStore();
    const all = useCatalogue(['sessions']);
    const entries = React.useMemo(
      () =>
        all.filter(
          (e) =>
            !e.isEvent &&
            e.category !== 'event' &&
            (LIVE_KEYS.includes(e.name.toLowerCase()) ||
              e.name.startsWith('metadata')),
        ),
      [all],
    );
    const editor = buildFilterEditor(liveSearchTarget(searchStoreLive));
    const list = sessionStore.liveSessions;
    const total = sessionStore.totalLiveSessions;
    const loading = sessionStore.loadingLiveSessions;
    const { currentPage } = searchStoreLive;
    const pageSize = useRowsPerPage();
    const { sort, order } = searchStoreLive.instance;
    const noRules = editor.properties.length === 0;

    React.useEffect(() => {
      if (projectsStore.activeSiteId) void searchStoreLive.fetchSessions(true);
    }, [projectsStore.activeSiteId]);

    React.useEffect(() => {
      const id = setInterval(() => {
        if (!document.hidden) void searchStoreLive.fetchSessions();
      }, AUTOREFRESH_INTERVAL);
      return () => clearInterval(id);
    }, []);

    const headerSort: ColumnSort | null =
      sort === 'duration' || sort === 'timestamp'
        ? {
            column: sort === 'duration' ? 'duration' : 'started',
            desc: order === 'desc',
          }
        : null;

    const onSort = (next: ColumnSort | null) => {
      // the table clears a column after desc, but the list is always sorted:
      // clearing "started" (the default) flips it to asc, clearing duration
      // falls back to the default
      if (!next) {
        searchStoreLive.edit({
          sort: 'timestamp',
          order: sort === 'timestamp' ? 'asc' : 'desc',
        });
        return;
      }
      searchStoreLive.edit({
        sort: next.column === 'duration' ? 'duration' : 'timestamp',
        order: next.desc ? 'desc' : 'asc',
      });
    };

    const open = (s: Session, e: React.MouseEvent) => {
      if (onPick) return onPick(s);
      const link = withSiteId(
        liveSession(s.sessionId),
        projectsStore.getSiteId().siteId!,
      );
      if (e.ctrlKey || e.shiftKey || e.metaKey) window.open(link, '_blank');
      else history.push(link);
    };

    const filterToUser = (s: any) => {
      const userIdFilter = filterStore
        .getCurrentProjectFilters()
        .find((f) => f.name === FilterKey.USERID);
      if (!userIdFilter) return;
      userIdFilter.value = [s.userId ?? s.userAnonymousId];
      searchStoreLive.addFilter(userIdFilter);
    };

    const onMetaClick = (key: string, value: string) => {
      const filter = filterStore.findEvent({ displayName: key });
      if (!filter?.name) return;
      filter.value = [value];
      searchStoreLive.addFilter(filter);
    };

    return (
      <>
        <EntryField
          entries={entries}
          taken={editor.properties.map((f) => f.entry.id)}
          onPick={editor.onAdd}
          hasRules={!noRules}
          placeholder={t('Filter the live sessions')}
          trailing={
            <IconButton
              icon={<RefreshCw size={14} />}
              label={t('Refresh live sessions')}
              variant="ghost"
              onClick={() => void searchStoreLive.fetchSessions(true)}
            />
          }
        />
        {!noRules && (
          <PagePanel spills>
            <FilterBar
              editor={editor}
              entries={entries}
              lead={t('Filter the live sessions')}
              live
            />
          </PagePanel>
        )}
        <PagePanel
          head={
            <>
              <span className="m-cb__count">
                {t('{{n}} live now', { n: total.toLocaleString() })}
              </span>
            </>
          }
        >
          {loading && list.length === 0 ? (
            <SkeletonRows rows={4} />
          ) : list.length === 0 ? (
            noRules ? (
              <EmptyState
                art="cobrowse"
                title={t('No one is live right now')}
                hint={t(
                  'A user who opens your app with the Assist plugin on shows up here. Join them to see their screen, talk, and take the controls.',
                )}
                action={
                  <Button asChild>
                    <a
                      href="https://docs.openreplay.com/plugins/assist"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('Assist plugin docs')}
                      <ExternalArrow size={13} />
                    </a>
                  </Button>
                }
              >
                <StartPath
                  steps={[
                    {
                      icon: <Plug />,
                      label: t('Add the Assist plugin'),
                      hint: t('Next to the tracker'),
                    },
                    {
                      icon: <Globe />,
                      label: t('A user opens your app'),
                      hint: t('They appear here, live'),
                    },
                    {
                      icon: <Headset />,
                      label: t('Join their session'),
                      hint: t('Watch, talk, take over'),
                    },
                  ]}
                />
              </EmptyState>
            ) : (
              <EmptyState
                art="search"
                title={t('No live sessions match this filter')}
                hint={t('Loosen one of the rules above.')}
                action={
                  <Button onClick={() => searchStoreLive.clearSearch()}>
                    {t('Clear the filter')}
                  </Button>
                }
              />
            )
          ) : (
            <>
              <SessionsTable
                rows={list}
                fields={onPick ? PICKER_FIELDS : LIVE_FIELDS}
                sortable={['started', 'duration']}
                sort={headerSort}
                onSort={onSort}
                onOpen={open}
                onFilterToUser={filterToUser}
                onMetaClick={onMetaClick}
                rowDisabled={isPicked}
              />
              <ListFooter
                page={currentPage}
                pageSize={pageSize}
                total={total}
                noun={(count, n) => t('{{n}} live sessions', { count, n })}
                onPage={(page) => searchStoreLive.updateCurrentPage(page)}
                onPageSize={(n) => {
                  setRowsPerPage(n);
                  if (currentPage === 1)
                    void searchStoreLive.fetchSessions(true);
                  else searchStoreLive.updateCurrentPage(1);
                }}
              />
            </>
          )}
        </PagePanel>
      </>
    );
  },
);

type RecordingSort = { key: 'at' | 'duration'; desc: boolean } | null;

export const RecordingsSection = observer(() => {
  const { t } = useTranslation();
  const { recordingsStore, settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;
  const { recordings, page, total, loading } = recordingsStore;
  const pageSize = useRowsPerPage();
  const [query, setQuery] = React.useState(recordingsStore.search);
  const [renaming, setRenaming] = React.useState<IRecord | null>(null);
  const [deleting, setDeleting] = React.useState<IRecord | null>(null);
  // the date is the API's order; the duration sorts the page shown
  const [sort, setSort] = React.useState<RecordingSort>(() =>
    recordingsStore.order === 'asc' ? { key: 'at', desc: false } : null,
  );
  const updateSearch = React.useMemo(
    () => debounce((v: string) => recordingsStore.updateSearch(v), 400),
    [],
  );

  React.useEffect(() => {
    void recordingsStore.fetchRecordings();
  }, [
    page,
    pageSize,
    recordingsStore.order,
    recordingsStore.period,
    recordingsStore.search,
    recordingsStore.currentUser,
  ]);

  const rows = React.useMemo(
    () =>
      sort?.key === 'duration'
        ? [...recordings].sort((a, b) =>
            sort.desc ? b.duration - a.duration : a.duration - b.duration,
          )
        : recordings,
    [recordings, sort],
  );
  const narrowed =
    !!recordingsStore.search ||
    recordingsStore.currentUser ||
    recordingsStore.period.rangeName !== LAST_7_DAYS;
  const resetQuery = () => {
    setQuery('');
    recordingsStore.updateSearch('');
    recordingsStore.setCurrUser(false);
    recordingsStore.updateTimestamps(Period({ rangeName: LAST_7_DAYS }));
  };

  const columns: Column<IRecord>[] = [
    {
      title: t('Recording'),
      key: 'name',
      priority: 1,
      render: (r) => (
        <span className="m-ss__name m-truncate m-cb__rec-name">{r.name}</span>
      ),
    },
    {
      title: t('Recorded by'),
      key: 'by',
      width: 184,
      priority: 3,
      render: (r) => (
        <span className="m-cb__owner m-truncate">{r.createdBy}</span>
      ),
    },
    {
      title: t('Duration'),
      key: 'duration',
      width: 96,
      sortable: true,
      priority: 2,
      render: (r) => (
        <span className="m-ss__fig">
          {formatDuration(Math.round(r.duration / 1000))}
        </span>
      ),
    },
    {
      title: t('Recorded'),
      key: 'at',
      width: 112,
      sortable: true,
      priority: 2,
      render: (r) => (
        <RelativeTime at={r.createdAt} timezone={timezone.value} />
      ),
    },
    {
      title: '',
      key: 'play',
      width: 88,
      align: 'center',
      className: 'm-ss__playcell',
      render: (r) => (
        <span className="m-ss__acts">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="m-ss__queue m-cb__rec-more"
                aria-label={t('Actions for {{name}}', { name: r.name })}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal size={15} aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItems
                items={[
                  {
                    key: 'rename',
                    icon: <Pencil size={13} />,
                    label: t('Rename'),
                    onClick: () => setRenaming(r),
                  },
                  {
                    key: 'delete',
                    icon: <Trash2 size={13} />,
                    label: t('Delete'),
                    danger: true,
                    onClick: () => setDeleting(r),
                  },
                ]}
              />
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="m-ss__play">
            <OpenReplayMark variant="plain" filled />
          </span>
        </span>
      ),
    },
  ];

  return (
    <PagePanel
      head={
        <>
          <FilterStrip
            label={t('Filter by who recorded')}
            items={[
              { key: 'all', label: t('All recordings') },
              { key: 'mine', label: t('My recordings') },
            ]}
            selected={[recordingsStore.currentUser ? 'mine' : 'all']}
            onSelect={(k) => recordingsStore.setCurrUser(k === 'mine')}
          />
          <span className="m-page__controls">
            <SearchField
              placeholder={t('Search recordings')}
              value={query}
              onChange={(v) => {
                setQuery(v);
                updateSearch(v);
              }}
            />
            <DateRange
              field={t('Recorded')}
              period={recordingsStore.period}
              onChange={(p) => recordingsStore.updateTimestamps(p)}
            />
          </span>
        </>
      }
    >
      {loading && recordings.length === 0 ? (
        <SkeletonRows rows={6} />
      ) : recordings.length === 0 ? (
        narrowed ? (
          <EmptyState
            title={t('Nothing matches')}
            hint={t('Widen the window, or clear the search.')}
            action={
              <Button onClick={resetQuery}>{t('Show all recordings')}</Button>
            }
          />
        ) : (
          <EmptyState
            art="cobrowse"
            state="cobrowse-videos"
            title={t('No calls recorded yet')}
            hint={t(
              'Record a call from a live session and it lands here, for the whole team to watch back.',
            )}
          />
        )
      ) : (
        <>
          <DataTable<IRecord>
            className="m-ss__table m-cb__recs"
            rowKey={(r) => String(r.recordId)}
            columns={columns}
            rows={rows}
            sort={sort}
            onSort={(key, desc) => {
              const next: RecordingSort =
                key === 'at' || key === 'duration' ? { key, desc } : null;
              setSort(next);
              const order = next?.key === 'at' && !next.desc ? 'asc' : 'desc';
              if (order !== recordingsStore.order)
                recordingsStore.setOrder(order);
            }}
            rowClassName={() => 'm-ss__row'}
            rowStyle={(r) =>
              ({ '--m-avatar-i': hueIndexFor(r.name) }) as CSSProperties
            }
            onRowClick={(r) => recordingsStore.openRecording(r)}
            ariaLabel={t('Recorded calls')}
          />
          <ListFooter
            page={page}
            pageSize={pageSize}
            total={total}
            noun={(count, n) => t('{{n}} recordings', { count, n })}
            onPage={(p) => recordingsStore.updatePage(p)}
            onPageSize={(n) => {
              setRowsPerPage(n);
              recordingsStore.updatePage(1);
            }}
          />
        </>
      )}
      <RecordingDialogs
        renaming={renaming}
        deleting={deleting}
        onClose={() => {
          setRenaming(null);
          setDeleting(null);
        }}
      />
    </PagePanel>
  );
});

export default observer(CoBrowsePage);

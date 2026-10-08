import usePageTitle from '@/hooks/usePageTitle';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { RelativeTime } from '@/ui/data/RelativeTime';
import { type Column, DataTable } from '@/ui/data/table';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { DateRange } from '@/ui/inputs/DateRange';
import { SearchField } from '@/ui/inputs/SearchField';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { Tabs, TabsList, TabsTrigger } from '@/ui/layout/tabs';
import { ConfirmDialog } from '@/ui/overlays/ConfirmDialog';
import { RenameDialog } from '@/ui/overlays/RenameDialog';
import { useToast } from '@/ui/overlays/toast';
import { FilterKey } from 'Types/filter/filterType';
import type Session from 'Types/session';
import {
  ChartColumn,
  Globe,
  Headset,
  MoreHorizontal,
  Pencil,
  Play,
  Plug,
  RefreshCw,
  SquareArrowOutUpRight,
  Trash2,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React from 'react';
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

import './cobrowse-page.css';

// jspdf, html2canvas and echarts: only when the stats drawer opens
const AssistStats = React.lazy(() => import('Components/AssistStats'));

const AUTOREFRESH_INTERVAL = 2 * 60 * 1000;
const PER_PAGE = 10;
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
  const { userStore } = useStore();
  const { showModal } = useModal();
  const [section, setSection] = React.useState<Section>('live');
  const modules = userStore.account.settings?.modules ?? [];
  const { isEnterprise } = userStore;
  const hasRecordings =
    isEnterprise && !modules.includes(MODULES.OFFLINE_RECORDINGS);
  const hasReports =
    isEnterprise &&
    userStore.isAdmin &&
    !modules.includes(MODULES.ASSIST_STATS) &&
    !modules.includes(MODULES.ASSIST);

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
      searchStoreLive.edit({
        sort: next?.column === 'duration' ? 'duration' : 'timestamp',
        order: next && !next.desc ? 'asc' : 'desc',
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
              <IconButton
                icon={<RefreshCw size={14} />}
                label={t('Refresh live sessions')}
                variant="ghost"
                onClick={() => void searchStoreLive.fetchSessions(true)}
              />
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
                      <SquareArrowOutUpRight size={13} aria-hidden="true" />
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
                liveBadge={false}
                rowDisabled={isPicked}
              />
              <ListFooter
                page={currentPage}
                pageSize={PER_PAGE}
                total={total}
                noun={[t('live session'), t('live sessions')]}
                onPage={(page) => searchStoreLive.updateCurrentPage(page)}
              />
            </>
          )}
        </PagePanel>
      </>
    );
  },
);

export const RecordingsSection = observer(() => {
  const { t } = useTranslation();
  const toast = useToast();
  const { recordingsStore, settingsStore } = useStore();
  const { timezone } = settingsStore.sessionSettings;
  const { recordings, page, pageSize, total, loading } = recordingsStore;
  const [query, setQuery] = React.useState(recordingsStore.search);
  const [renaming, setRenaming] = React.useState<IRecord | null>(null);
  const [deleting, setDeleting] = React.useState<IRecord | null>(null);
  const updateSearch = React.useMemo(
    () => debounce((v: string) => recordingsStore.updateSearch(v), 400),
    [],
  );

  React.useEffect(() => {
    void recordingsStore.fetchRecordings();
  }, [
    page,
    recordingsStore.period,
    recordingsStore.search,
    recordingsStore.currentUser,
  ]);

  // the tab opens inside the click (popup blockers drop a window.open made
  // after an await) and gets its URL once the presigned link arrives
  const play = (r: IRecord) => {
    const tab = window.open('', '_blank');
    void recordingsStore.fetchRecordingUrl(r.recordId).then((url) => {
      if (!tab) return;
      if (url) tab.location.href = url;
      else tab.close();
    });
  };

  const columns: Column<IRecord>[] = [
    {
      title: t('Name'),
      key: 'name',
      width: '44%',
      render: (r) => (
        <span className="m-cb__identity-cell">
          <span className="min-w-0">
            <span className="m-truncate block">{r.name}</span>
            <span className="m-cb__sub m-cb__mono">
              {formatDuration(Math.round(r.duration / 1000))}
            </span>
          </span>
        </span>
      ),
    },
    {
      title: t('Recorded by'),
      key: 'by',
      width: '22%',
      render: (r) => <span className="m-truncate">{r.createdBy}</span>,
    },
    {
      title: t('Recorded'),
      key: 'at',
      width: '16%',
      render: (r) => (
        <RelativeTime at={r.createdAt} timezone={timezone.value} />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: '18%',
      align: 'right',
      render: (r) => (
        <span className="m-cb__actions">
          <button type="button" className="m-cb__play" onClick={() => play(r)}>
            <Play size={12} aria-hidden="true" />
            {t('Play video')}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="subtle"
                size="icon"
                aria-label={t('Actions for {{name}}', { name: r.name })}
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
        </span>
      ),
    },
  ];

  return (
    <PagePanel
      head={
        <>
          <FilterStrip
            label={t('Whose recordings')}
            items={[
              { key: 'all', label: t('All videos') },
              { key: 'mine', label: t('My videos') },
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
        <SkeletonRows rows={4} />
      ) : recordings.length === 0 ? (
        <EmptyState
          title={
            recordingsStore.search
              ? t('No matching results')
              : t('No videos have been recorded in your co-browsing sessions.')
          }
          hint={t(
            'Capture and share video recordings of co-browsing sessions with your team for product feedback and training.',
          )}
        />
      ) : (
        <>
          <DataTable<IRecord>
            rowKey={(r) => String(r.recordId)}
            columns={columns}
            rows={recordings}
            rowClassName={() => 'm-cb__row'}
            onRowClick={(r) => void play(r)}
            ariaLabel={t('Co-browsing recordings')}
          />
          <ListFooter
            page={page}
            pageSize={pageSize}
            total={total}
            noun={[t('recording'), t('recordings')]}
            onPage={(p) => recordingsStore.updatePage(p)}
          />
        </>
      )}

      <RenameDialog
        open={renaming != null}
        title={t('Rename recording')}
        value={renaming?.name ?? ''}
        onCancel={() => setRenaming(null)}
        onOk={(name) => {
          if (renaming) {
            recordingsStore
              .updateRecordingName(renaming.recordId, name)
              .then(() => {
                void recordingsStore.fetchRecordings();
                toast.success(t('Recording name updated'));
              })
              .catch(() => toast.error(t("Couldn't update recording name")));
          }
          setRenaming(null);
        }}
      />
      <ConfirmDialog
        open={deleting != null}
        title={t('Delete this recording?')}
        okText={t('Delete')}
        danger
        onCancel={() => setDeleting(null)}
        onOk={() => {
          const target = deleting;
          setDeleting(null);
          if (!target) return;
          void recordingsStore.deleteRecording(target.recordId).then(() => {
            recordingsStore.setRecordings(
              recordingsStore.recordings.filter(
                (rec) => rec.recordId !== target.recordId,
              ),
              recordingsStore.total - 1,
            );
            toast.success(t('Recording deleted'));
          });
        }}
      >
        {t(
          '{{name}} is deleted for everyone on the team. The co-browsing session it came from is not affected.',
          { name: deleting?.name },
        )}
      </ConfirmDialog>
    </PagePanel>
  );
});

export default observer(CoBrowsePage);

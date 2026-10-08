import { trackerInstance } from '@/init/openreplay';
import { IconButton } from '@/ui/actions/IconButton';
import { Button } from '@/ui/actions/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItems,
  DropdownMenuTrigger,
} from '@/ui/actions/dropdown-menu';
import { EmptyState } from '@/ui/feedback/EmptyState';
import { SkeletonRows } from '@/ui/feedback/SkeletonRows';
import { DisplayShell, MenuSelect } from '@/ui/filters/DisplayMenu';
import { FilterStrip } from '@/ui/filters/FilterStrip';
import { DateRange } from '@/ui/inputs/DateRange';
import { ListFooter } from '@/ui/layout/ListFooter';
import { PageCard, PagePanel } from '@/ui/layout/PageCard';
import { useToast } from '@/ui/overlays/toast';
import { Tooltip } from '@/ui/overlays/tooltip';
import withPermissions from 'HOCs/withPermissions';
import Period from 'Types/app/period';
import { FilterKey } from 'Types/filter/filterType';
import { issues_types, types } from 'Types/session/issue';
import {
  Angry,
  BookOpen,
  CircleAlert,
  MessageCircleWarning,
  MoreHorizontal,
  Settings2,
  Share2,
  Skull,
  WifiOff,
} from 'lucide-react';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useStore } from 'App/mstore';
import { CLIENT_TABS, client } from 'App/routes';
import { useLocation, useNavigate } from 'App/routing';

import {
  EntryField,
  FilterBar,
  buildFilterEditor,
  searchTarget,
  useCatalogue,
} from 'Shared/FilterEditor';
import NoSessionsMessage from 'Shared/NoSessionsMessage/NoSessionsMessage';
import SaveSearchModal from 'Shared/SaveSearchModal/SaveSearchModal';
import { useSessionQueue } from 'Shared/SessionsDock/openSessions';
import {
  ALL_FIELDS,
  type ColumnSort,
  type SessionField,
  SessionsTable,
} from 'Shared/SessionsTable/SessionsTable';
import { useOpenSession } from 'Shared/SessionsTable/useOpenSession';

import './sessions-page.css';

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;
const FIELDS_KEY = '__or_sessions_fields';

const ISSUE_ICONS: Record<string, React.ReactNode> = {
  [types.JS_EXCEPTION]: <CircleAlert size={13} aria-hidden="true" />,
  [types.BAD_REQUEST]: <WifiOff size={13} aria-hidden="true" />,
  [types.CLICK_RAGE]: <Angry size={13} aria-hidden="true" />,
  [types.TAP_RAGE]: <Angry size={13} aria-hidden="true" />,
  [types.CRASH]: <Skull size={13} aria-hidden="true" />,
  [types.INCIDENT]: <MessageCircleWarning size={13} aria-hidden="true" />,
};

type OrderKey =
  | 'startTs-desc'
  | 'startTs-asc'
  | 'eventsCount-desc'
  | 'eventsCount-asc';
const DEFAULT_ORDER: OrderKey = 'startTs-desc';

const readFields = (): SessionField[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(FIELDS_KEY) ?? 'null');
    if (Array.isArray(raw)) return ALL_FIELDS.filter((f) => raw.includes(f));
  } catch {}
  return [...ALL_FIELDS];
};

function SessionsTabOverview() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    searchStore,
    sessionStore,
    filterStore,
    projectsStore,
    settingsStore,
  } = useStore();
  const entries = useCatalogue(['sessions']);
  const editor = buildFilterEditor(searchTarget(searchStore));
  const { open, hover } = useOpenSession();
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<SessionField[]>(readFields);

  const { list, total, lastPlayedSessionId } = sessionStore;
  const loading = sessionStore.loadingSessions;
  const { currentPage, pageSize, activeTags } = searchStore;
  const { sort, order, startDate, endDate, rangeValue } = searchStore.instance;
  const orderKey = `${sort}-${order}` as OrderKey;
  const platform = projectsStore.active?.platform || 'web';
  const queue = useSessionQueue(String(projectsStore.activeSiteId ?? ''));

  // back from a replay, the list is where you left it; the page card's body scrolls
  const hasRows = list.length > 0;
  React.useEffect(() => {
    if (!hasRows) return undefined;
    const body = document.querySelector<HTMLElement>('.m-page__body');
    if (!body) return undefined;
    const restore = requestAnimationFrame(() => {
      body.scrollTop = searchStore.scrollY;
    });
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        searchStore.setScrollPosition(body.scrollTop),
      );
    };
    body.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(restore);
      cancelAnimationFrame(frame);
      body.removeEventListener('scroll', onScroll);
    };
  }, [hasRows]);
  const timezone = settingsStore.sessionSettings.timezone?.value;
  const noRules = editor.events.length + editor.properties.length === 0;
  const usesSegment = editor.properties
    .concat(editor.events)
    .some((f) => f.entry.category === 'segments');

  useEffect(() => {
    trackerInstance.event('session_list_viewed');
  }, []);

  useEffect(() => {
    if (!searchStore.urlParsed) return;
    void searchStore.checkForLatestSessionCount();
  }, [location.pathname]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) void searchStore.checkForLatestSessionCount();
    }, AUTO_REFRESH_INTERVAL);
    let wake: ReturnType<typeof setTimeout> | undefined;
    const onVisible = () => {
      clearTimeout(wake);
      if (document.hidden) return;
      wake = setTimeout(() => {
        if (!document.hidden) void searchStore.checkForLatestSessionCount();
      }, 5000);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      clearTimeout(wake);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    searchStore.resetTags();
  }, [projectsStore.activeSiteId]);

  const setOrder = (key: OrderKey) => {
    const [nextSort, nextOrder] = key.split('-');
    searchStore.applyFilter({ sort: nextSort, order: nextOrder });
    void searchStore.fetchSessions();
  };

  const toggleField = (f: string) => {
    const next = fields.includes(f as SessionField)
      ? fields.filter((x) => x !== f)
      : ALL_FIELDS.filter((x) => x === f || fields.includes(x));
    setFields(next);
    localStorage.setItem(FIELDS_KEY, JSON.stringify(next));
  };

  const resetDisplay = () => {
    setFields([...ALL_FIELDS]);
    localStorage.removeItem(FIELDS_KEY);
    if (orderKey !== DEFAULT_ORDER) setOrder(DEFAULT_ORDER);
  };

  const displayChanges =
    (orderKey !== DEFAULT_ORDER ? 1 : 0) +
    (fields.length !== ALL_FIELDS.length ? 1 : 0);

  const headerSort: ColumnSort | null =
    orderKey === DEFAULT_ORDER
      ? null
      : {
          column: sort === 'eventsCount' ? 'events' : 'started',
          desc: order === 'desc',
        };

  const onHeaderSort = (next: ColumnSort | null) => {
    if (!next) return setOrder(DEFAULT_ORDER);
    const col = next.column === 'events' ? 'eventsCount' : 'startTs';
    setOrder(`${col}-${next.desc ? 'desc' : 'asc'}` as OrderKey);
  };

  const filterToUser = (s: any) => {
    if (!s.userId) return;
    const userIdFilter = filterStore.findEvent({
      name: FilterKey.USERID,
      category: 'user',
    });
    if (!userIdFilter?.name) return;
    userIdFilter.value = [s.userId];
    searchStore.addFilter(userIdFilter);
  };

  const onMetaClick = (key: string, value: string) => {
    const filter = filterStore.findEvent({ displayName: key });
    if (!filter?.name) return;
    filter.value = [value];
    searchStore.addFilter(filter);
  };

  const share = async () => {
    if (searchStore.instance.filters.length === 0) return;
    try {
      await searchStore.saveAsShare();
      const id = searchStore.savedSearch.searchId;
      if (!id) return;
      await navigator.clipboard.writeText(
        `${window.location.origin}${window.location.pathname}?sid=${id}`,
      );
      toast.success(t('Link copied to clipboard'));
    } catch {
      toast.error(t('Failed to share segment'));
    }
  };

  const period = Period({
    start: startDate,
    end: endDate,
    rangeName: rangeValue,
  });

  const issueTabs = issues_types.filter(
    (tag) =>
      tag.type !== 'mouse_thrashing' &&
      (platform === 'web'
        ? tag.type !== types.TAP_RAGE
        : tag.type !== types.CLICK_RAGE),
  );

  const empty = noRules ? (
    <EmptyState
      art="range"
      title={t('Nothing in this window')}
      hint={t('Widen the date window and the sessions come back.')}
      action={
        <Button
          onClick={() => {
            searchStore.updateCurrentPage(1);
            void searchStore.fetchSessions(true);
          }}
        >
          {t('Refresh')}
        </Button>
      }
    />
  ) : (
    <EmptyState
      art="search"
      title={t('No sessions match')}
      hint={t(
        'Every rule above is doing its job. Loosen one, or widen the date window.',
      )}
      action={
        <Button onClick={() => searchStore.clearSearch()}>
          {t('Clear the filter')}
        </Button>
      }
    />
  );

  return (
    <PageCard
      title={t('Sessions')}
      subtitle={t('Every session recorded on this project.')}
      actions={
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
                  key: 'share',
                  icon: <Share2 size={13} />,
                  label: t('Copy link to this search'),
                  disabled: noRules,
                  onClick: share,
                },
                {
                  key: 'settings',
                  icon: <Settings2 size={13} />,
                  label: t('Session settings'),
                  onClick: () => navigate(client(CLIENT_TABS.SESSION_SETTINGS)),
                },
                {
                  key: 'docs',
                  icon: <BookOpen size={13} />,
                  label: t('Documentation'),
                  onClick: () =>
                    window.open(
                      'https://docs.openreplay.com/en/session-replay/',
                      '_blank',
                    ),
                },
              ]}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      }
      split
    >
      <NoSessionsMessage />
      <EntryField
        entries={entries}
        taken={editor.properties.map((f) => f.entry.id)}
        onPick={editor.onAdd}
        hasRules={!noRules}
      />

      {!noRules && (
        <PagePanel spills>
          <FilterBar
            editor={editor}
            entries={entries}
            saveAction={
              <Tooltip
                title={
                  usesSegment
                    ? t('A filter that uses a segment cannot itself be saved')
                    : t(
                        'Save these rules as a segment. The date window is not part of it.',
                      )
                }
              >
                <span>
                  <Button
                    className="m-fbar__save"
                    disabled={usesSegment}
                    onClick={() => setSaving(true)}
                  >
                    {t('Save as segment')}
                  </Button>
                </span>
              </Tooltip>
            }
          />
        </PagePanel>
      )}

      <PagePanel
        head={
          <>
            <FilterStrip
              label={t('Filter by issue type')}
              items={issueTabs.map((tag) => ({
                key: tag.type,
                label: t(tag.name),
                icon: ISSUE_ICONS[tag.type],
              }))}
              selected={[activeTags[0] ?? 'all']}
              onSelect={(key) => searchStore.toggleTag(key as any)}
            />
            <span className="m-recs__display">
              <DateRange
                field={t('Started')}
                period={period}
                onChange={(p) => {
                  searchStore.edit(p.toJSON());
                  void searchStore.fetchSessions(true);
                }}
              />
              <DisplayShell
                changeCount={displayChanges}
                onReset={resetDisplay}
                rows={[
                  {
                    id: 'ss-sort',
                    label: t('Order'),
                    control: (
                      <MenuSelect<OrderKey>
                        id="ss-sort"
                        value={orderKey}
                        choices={[
                          { value: 'startTs-desc', label: t('Newest first') },
                          { value: 'startTs-asc', label: t('Oldest first') },
                          {
                            value: 'eventsCount-desc',
                            label: t('Most events'),
                          },
                          {
                            value: 'eventsCount-asc',
                            label: t('Fewest events'),
                          },
                        ]}
                        onChange={setOrder}
                      />
                    ),
                  },
                ]}
                fields={ALL_FIELDS.map((f) => ({
                  value: f,
                  label: t(f.charAt(0).toUpperCase() + f.slice(1)),
                  on: fields.includes(f),
                }))}
                onToggleField={toggleField}
              />
            </span>
          </>
        }
      >
        {searchStore.latestSessionCount > 0 && (
          <button
            type="button"
            className="m-recs__latest"
            onClick={() => {
              searchStore.updateLatestSessionCount(0);
              void searchStore.updateCurrentPage(1, true);
            }}
          >
            {t('Show {{count}} new sessions', {
              count: searchStore.latestSessionCount,
            })}
          </button>
        )}
        {loading && list.length === 0 ? (
          <SkeletonRows rows={8} />
        ) : list.length === 0 ? (
          empty
        ) : (
          <>
            <SessionsTable
              rows={list}
              fields={fields}
              sortable={['started', 'events']}
              sort={headerSort}
              onSort={onHeaderSort}
              onOpen={open}
              onHover={hover}
              onFilterToUser={filterToUser}
              onMetaClick={onMetaClick}
              lastViewedId={lastPlayedSessionId}
              timezone={timezone}
              userTimezone={
                settingsStore.sessionSettings.shownTimezone === 'user'
              }
              queue={queue}
            />
            <ListFooter
              page={currentPage}
              pageSize={pageSize}
              total={total}
              noun={[t('session'), t('sessions')]}
              onPage={(page) => searchStore.updateCurrentPage(page)}
            />
          </>
        )}
      </PagePanel>
      <SaveSearchModal show={saving} closeHandler={() => setSaving(false)} />
    </PageCard>
  );
}

export default withPermissions(
  ['SESSION_REPLAY', 'SERVICE_SESSION_REPLAY'],
  '',
  false,
  false,
)(observer(SessionsTabOverview));

import cn from 'classnames';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import React from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  File,
  User,
  Search,
} from 'lucide-react';
import {
  MoreOutlined,
  CloseOutlined,
  UserSwitchOutlined,
  InfoCircleOutlined,
  ShareAltOutlined,
  LeftOutlined,
  RightOutlined,
  CaretRightOutlined,
  PauseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import Tabs from 'Components/Session/Tabs';
import EventGroupWrapper from 'Components/Session_/EventsBlock/EventGroupWrapper';
import eventsStyles from 'Components/Session_/EventsBlock/eventsBlock.module.css';
import { TYPES } from 'Types/session/event';
import {
  Button,
  ConfigProvider,
  Dropdown,
  Input,
  Popover,
  Segmented,
  Switch,
  Tooltip,
  message,
} from 'antd';
import HighlightButton from 'Components/Session_/Highlight/HighlightButton';
import SessionCopyLink from 'Components/shared/SharePopup/SessionCopyLink';
import 'Components/shared/AutoplayToggle/AutoplayToggle.css';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import {
  withSiteId,
  issues as issuesRoute,
  issue as issueDetailRoute,
  issueSession as issueSessionRoute,
} from 'App/routes';
import { CountryFlag, EscapeButton, Icon } from 'UI';
import { countries } from 'App/constants';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import SessionMetaList from 'Shared/SessionItem/SessionMetaList';
import {
  CAT_ICON,
  CRITICAL_REASONS,
  impactLevel,
  type Issue,
  type IssueSessionCard,
} from 'App/mstore/issuesStore';

import {
  debounceUpdate,
  getDefaultPanelHeight,
} from 'Components/Session/Player/ReplayPlayer/PlayerInst';
import { SpotOverviewPanelCont } from 'Components/Session_/OverviewPanel/OverviewPanel';
import SpotConsole from 'Components/Spots/SpotPlayer/components/Panels/SpotConsole';
import SpotNetwork from 'Components/Spots/SpotPlayer/components/Panels/SpotNetwork';
import SpotLocation from 'Components/Spots/SpotPlayer/components/SpotLocation';
import SpotPlayerControls from 'Components/Spots/SpotPlayer/components/SpotPlayerControls';
import SpotTimeline from 'Components/Spots/SpotPlayer/components/SpotTimeline';
import SpotVideoContainer from 'Components/Spots/SpotPlayer/components/SpotVideoContainer';
import spotPlayerStore, {
  PANELS,
} from 'Components/Spots/SpotPlayer/spotPlayerStore';

import { getMockSessionById } from 'App/dev/mockSessions';
import { ReasonChip, CategoryLabel, ImpactGauge } from './ProblemCard';
import sessionVideo from './sessionVideo';
import './issues.css';
import {
  MOCK_CLICKS,
  MOCK_LOCATIONS,
  MOCK_LOGS,
  MOCK_NETWORK,
} from './mockSessionData';

/* Full-screen session player for an issue's session — the real Spot player
   (location bar, video, timeline, controls, X-Ray / Console / Network panels)
   driven by spotPlayerStore, fed the recorded webm + mock mob data. Rendered
   via a portal so it covers the whole app. The header keeps the session info +
   More popover (reused look) and adds the issue name. The right sidebar offers
   Activity (real) and Issue (the rich AI context). */

type SideTab = 'activity' | 'issue' | null;

const SIDEBAR_W = 320;

/* The window (in seconds) where the AI located the issue, used to drive the
   issue indicators on the timeline and in the activity list. */
const ISSUE_START_S = 20;
const ISSUE_END_S = 30;

/* Activity list — the real session-replay Activity, not Spot's. Uses the shared
   EventGroupWrapper (same rows, grouping, current-event diamond + progress line
   as the session player) and the session header (framework export + "Search N
   events" + close), fed the mock events. A subtle red→orange gradient bar marks
   the activities that fall inside the issue window. */
const IssueActivity = observer(({ onClose }: { onClose: () => void }) => {
  const [query, setQuery] = React.useState('');
  const [searching, setSearching] = React.useState(false);

  // normalize the mock locations/clicks into the shape EventGroupWrapper expects
  const events = React.useMemo(() => {
    const merged = [
      ...spotPlayerStore.locations.map((e: any, i: number) => ({
        ...e,
        type: TYPES.LOCATION,
        url: e.location,
        key: `loc-${i}`,
      })),
      ...spotPlayerStore.clicks.map((e: any, i: number) => ({
        type: TYPES.CLICK,
        label: e.label,
        count: 1,
        time: e.time,
        key: `clk-${i}`,
      })),
    ];
    return merged.sort((a, b) => a.time - b.time);
  }, [spotPlayerStore.locations, spotPlayerStore.clicks]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return events;
    const q = query.toLowerCase();
    return events.filter((e: any) =>
      `${e.label ?? ''} ${e.url ?? ''}`.toLowerCase().includes(q),
    );
  }, [events, query]);

  const { index } = spotPlayerStore.getHighlightedEvent(
    spotPlayerStore.time,
    filtered,
  );
  const onEventClick = (_: any, event: any) =>
    spotPlayerStore.setTime(event.time / 1000);
  const inIssue = (t: number) =>
    t >= ISSUE_START_S * 1000 && t <= ISSUE_END_S * 1000;

  return (
    <div
      className="h-full bg-white border-l flex flex-col"
      style={{ minWidth: 320, width: 320, borderColor: 'var(--color-gray-light)' }}
    >
      {/* header — the real session-replay EventsBlock header (default-size
          controls, same gradient + CSS module), not Spot's */}
      <div
        className={cn(
          eventsStyles.header,
          'py-4 px-2 bg-linear-to-t from-transparent to-neutral-gray-lightest h-[57px] shrink-0',
        )}
      >
        {searching ? (
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              allowClear
              className="rounded-lg"
              prefix={<SearchOutlined />}
              placeholder={`Filter ${filtered.length} events`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              type="text"
              onClick={() => {
                setSearching(false);
                setQuery('');
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Tooltip title="Export to test code" placement="bottom">
              <Button type="default" shape="circle">
                <Icon name="cypress" size={18} />
              </Button>
            </Tooltip>
            <Button
              className="flex items-center gap-2"
              onClick={() => setSearching(true)}
            >
              <Search size={14} />
              <div>Search {filtered.length} events</div>
            </Button>
            <Tooltip title="Close panel" placement="bottom">
              <Button
                className="ml-auto"
                type="text"
                onClick={onClose}
                icon={<CloseOutlined />}
              />
            </Tooltip>
          </div>
        )}
      </div>

      {/* event list — session-replay EventGroupWrapper rows, fed mock events */}
      <div
        className={cn(
          'flex-1 min-h-0 overflow-y-auto pb-4',
          eventsStyles.eventsList,
        )}
        data-openreplay-masked
      >
        {filtered.length === 0 ? (
          <div
            className="flex items-center gap-2 p-4"
            style={{ color: 'var(--color-gray-medium)' }}
          >
            <Icon name="binoculars" size={18} />
            <span>No matching results</span>
          </div>
        ) : (
          filtered.map((event: any, i: number) => {
            const isLastEvent = i === filtered.length - 1;
            const isLastInGroup =
              isLastEvent || filtered[i + 1]?.type === TYPES.LOCATION;
            return (
              <div key={event.key} className="relative">
                {inIssue(event.time) && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 3,
                      top: 0,
                      width: 3,
                      height: '100%',
                      background:
                        'linear-gradient(180deg, var(--color-red), var(--color-orange))',
                      opacity: 0.55,
                      zIndex: 97,
                      borderRadius: 2,
                    }}
                  />
                )}
                <EventGroupWrapper
                  query={query}
                  presentInSearch
                  isFirst={i === 0}
                  onEventClick={onEventClick}
                  onCheckboxClick={() => {}}
                  event={event}
                  isLastEvent={isLastEvent}
                  isLastInGroup={isLastInGroup}
                  isCurrent={i === index}
                  isSearched={false}
                  showSelection={false}
                  isNote={false}
                  isTabChange={false}
                  isIncident={false}
                  isPrev={i < index}
                  filterOutNote={() => {}}
                  setActiveTab={() => {}}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

function TagChip({ label }: { label: string }) {
  return (
    <span
      className="text-sm px-2.5 py-0.5 rounded-md border whitespace-nowrap"
      style={{
        borderColor: 'var(--color-gray-light)',
        background: 'var(--color-gray-lightest)',
        color: 'var(--color-gray-dark)',
      }}
    >
      {label}
    </span>
  );
}

/* Critical toggle for the header — the exact issue-list control (the
   `critical-toggle` icon button, red `critical-on` backdrop when set). Marking
   is instant; un-marking opens the same teaching-moment reason popover used on
   the detail page. Kept in sync with the slide-out via the shared issuesStore. */
const HeaderCriticalToggle = observer(({ issue }: { issue: Issue }) => {
  const { issuesStore } = useStore();
  const [open, setOpen] = React.useState(false);
  const [reasons, setReasons] = React.useState<string[]>([]);
  const [note, setNote] = React.useState('');

  const btn = (
    <Tooltip title={issue.critical ? 'Critical — click to remove' : 'Mark as critical'}>
      <Button
        type="text"
        size="small"
        aria-pressed={issue.critical}
        className={`critical-toggle flex items-center justify-center shrink-0${
          issue.critical ? ' critical-on' : ''
        }`}
        icon={
          <AlertTriangle
            size={15}
            strokeWidth={2}
            style={{
              color: issue.critical
                ? 'var(--color-red)'
                : 'var(--color-gray-medium)',
              fill: 'none',
            }}
          />
        }
        onClick={() => {
          if (issue.critical) setOpen(true);
          else issuesStore.setCritical(issue.id, true);
        }}
      />
    </Tooltip>
  );

  if (!issue.critical) return btn;

  const panel = (
    <div className="flex flex-col gap-2" style={{ width: 264 }}>
      <span className="text-sm" style={{ color: 'var(--color-gray-dark)' }}>
        Why is this not critical?
      </span>
      <div className="flex flex-wrap gap-1.5">
        {CRITICAL_REASONS.map((t) => (
          <ReasonChip
            key={t}
            label={t}
            checked={reasons.includes(t)}
            onChange={(on) =>
              setReasons((p) => (on ? [...p, t] : p.filter((x) => x !== t)))
            }
          />
        ))}
      </div>
      <Input.TextArea
        rows={2}
        placeholder="Add a note (optional)…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end gap-2">
        <Button size="small" type="text" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="small"
          type="primary"
          danger
          onClick={() => {
            issuesStore.setCritical(
              issue.id,
              false,
              [...reasons, note.trim()].filter(Boolean).join(' · '),
            );
            setOpen(false);
            setReasons([]);
            setNote('');
          }}
        >
          Mark as not critical
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottomLeft"
      content={panel}
      zIndex={2147483647}
    >
      {btn}
    </Popover>
  );
});

/* The problem + the suggested fix as two tabs in one card (Mehdi: combine the
   issue and the resolution). Both stated plainly. */
function ProblemResolutionTabs({ issue }: { issue: Issue }) {
  const [view, setView] = React.useState<'problem' | 'fix'>('problem');
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: 'var(--color-gray-light)' }}
    >
      <div className="p-2 border-b" style={{ borderColor: 'var(--color-gray-light)' }}>
        <Segmented
          block
          value={view}
          onChange={(v) => setView(v as 'problem' | 'fix')}
          options={[
            { label: 'The problem', value: 'problem' },
            { label: 'Suggested fix', value: 'fix' },
          ]}
        />
      </div>
      <div className="p-3">
        <span
          style={{ color: 'var(--color-gray-dark)', fontSize: 15, lineHeight: 1.6 }}
        >
          {view === 'problem' ? issue.real : issue.fix || 'No suggestion yet.'}
        </span>
      </div>
    </div>
  );
}

const X_Ray = observer(() => {
  const endTime = spotPlayerStore.duration * 1000;
  const time = spotPlayerStore.time * 1000;
  const resourceList = spotPlayerStore.network
    .filter((r: any) => r.isRed || r.isYellow || (r.status && r.status >= 400))
    .filter((i: any) => i.type === 'xhr' || i.type === 'fetch');
  const exceptionsList = spotPlayerStore.logs.filter(
    (l: any) => l.level === 'error',
  );
  return (
    <SpotOverviewPanelCont
      exceptionsList={exceptionsList}
      resourceList={resourceList}
      spotTime={time}
      spotEndTime={endTime}
      onClose={() => spotPlayerStore.setActivePanel(null)}
      time={time}
    />
  );
});

function IssueSessionPlayer() {
  const history = useHistory();
  const { projectsStore, issuesStore } = useStore();
  const siteId = projectsStore.activeSiteId;
  const { sessionId } = useParams<{ sessionId: string }>();
  const sess = getMockSessionById(sessionId);

  // which issue owns this session (drives the header + Issue tab)
  const issue: Issue | undefined = issuesStore.all.find((i: Issue) =>
    (i.sessionIds ?? []).includes(sessionId),
  );
  const card: IssueSessionCard | undefined = issue
    ? issuesStore.exampleSessions(issue).find((c) => c.sessionId === sessionId)
    : undefined;

  const [panelHeight, setPanelHeight] = React.useState(getDefaultPanelHeight());
  const [tab, setTab] = React.useState<SideTab>('issue');
  const [autoplay, setAutoplay] = React.useState(false);
  const [bookmarked, setBookmarked] = React.useState(false);

  const email = card?.email ?? sess?.userId ?? 'anonymous';
  const browser = card?.browser ?? sess?.userBrowser ?? 'Chrome';
  const os = card?.os ?? sess?.userOs ?? 'Mac OS X';
  const device = card?.device ?? sess?.userDeviceType ?? 'desktop';
  const countryCode = card?.country ?? sess?.userCountry ?? '';
  const city = card?.city ?? sess?.userCity ?? '';
  const date = sess?.startTs
    ? new Date(sess.startTs).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Today';

  // this session is a VARIATION of the issue — lead the header with it,
  // and keep the parent issue as context on the line below
  const variation = card?.variation || card?.journey || issue?.head;

  // queue controls navigate across this issue's example sessions
  const sessions = issue ? issuesStore.exampleSessions(issue).slice(0, 3) : [];
  const sessIdx = sessions.findIndex((c) => c.sessionId === sessionId);
  const prevId = sessIdx > 0 ? sessions[sessIdx - 1].sessionId : null;
  const nextId =
    sessIdx >= 0 && sessIdx < sessions.length - 1
      ? sessions[sessIdx + 1].sessionId
      : null;
  const goSession = (sid: string) =>
    history.push(withSiteId(issueSessionRoute(sid), siteId));

  const toggleAutoplay = () => {
    const next = !autoplay;
    setAutoplay(next);
    next ? message.success('Autoplay is ON') : message.info('Autoplay is OFF');
  };
  const toggleBookmark = () => {
    const next = !bookmarked;
    setBookmarked(next);
    message.success(
      next
        ? 'Session added to your bookmarks'
        : 'Session removed from your bookmarks',
    );
  };

  React.useEffect(() => {
    spotPlayerStore.clearData();
    spotPlayerStore.setStartTs(0);
    spotPlayerStore.setDuration('1:01');
    spotPlayerStore.setDeviceData('144.0.0', '1440x900', os);
    spotPlayerStore.setEvents(
      MOCK_LOGS as any,
      MOCK_LOCATIONS as any,
      MOCK_CLICKS as any,
      MOCK_NETWORK as any,
    );
    spotPlayerStore.setIsPlaying(true);

    const ev = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === 'Escape') spotPlayerStore.setIsFullScreen(false);
      if (e.key === ' ')
        spotPlayerStore.setIsPlaying(!spotPlayerStore.isPlaying);
    };
    document.addEventListener('keydown', ev);
    return () => {
      document.removeEventListener('keydown', ev);
      spotPlayerStore.clearData();
    };
  }, []);

  const handleResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = panelHeight;
    const onMove = (ev: MouseEvent) => {
      const diff = startHeight - (ev.clientY - startY);
      const max = diff > window.innerHeight / 1.5 ? window.innerHeight / 1.5 : diff;
      setPanelHeight(Math.max(50, max));
      debounceUpdate(Math.max(50, max));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const back = () =>
    history.push(
      withSiteId(
        issue ? issueDetailRoute(String(issue.id)) : issuesRoute(),
        siteId,
      ),
    );
  const { isFullScreen, activePanel } = spotPlayerStore;
  const Divider = () => (
    <div className="h-6 border-l mx-1" style={{ borderColor: 'var(--color-gray-light)' }} />
  );

  const CatIc = issue ? CAT_ICON[issue.cat] : null;
  const morePopover = (
    <div className="text-left bg-white">
      {issue && CatIc && (
        <SessionInfoItem
          comp={<CatIc size={16} strokeWidth={2} style={{ color: '#3EAAAF' }} />}
          label="Category"
          value={issue.cat}
        />
      )}
      <SessionInfoItem
        comp={
          <User size={16} strokeWidth={2} style={{ color: 'var(--color-gray-medium)' }} />
        }
        label="User"
        value={email}
      />
      <SessionInfoItem
        comp={<CountryFlag country={countryCode} />}
        label={countries[countryCode] || countryCode || 'Unknown'}
        value={city}
      />
      <SessionInfoItem icon={browserIcon(browser)} label={browser} value="v144.0.0" />
      <SessionInfoItem icon={osIcon(os)} label={os} value="10.15.7" />
      <SessionInfoItem
        icon={deviceTypeIcon(device)}
        label={device}
        value="1440 × 900"
        isLast
      />
    </div>
  );

  const content = (
    <div className="fixed inset-0 bg-white flex flex-col overflow-hidden" style={{ zIndex: 2147482000 }}>
      {isFullScreen && (
        <EscapeButton onClose={() => spotPlayerStore.setIsFullScreen(false)} />
      )}

      {/* header: session info + issue name, with Activity / Issue tabs */}
      {!isFullScreen && (
        <div className="flex items-center gap-1 px-2 py-2.5 w-full bg-white border-b" style={{ borderColor: 'var(--color-gray-light)' }}>
          <Tooltip title={issue ? `Back to “${issue.head}”` : 'Back to issues'}>
            <Button type="text" size="small" icon={<ArrowLeft size={15} />} onClick={back} className="px-2">
              Back to issue
            </Button>
          </Tooltip>
          <Divider />
          {/* Lead with this session's VARIATION of the issue (what the card was
              titled by); the parent issue + who/when sit on the line below, and
              the environment specs live behind "More". */}
          <div className="leading-tight min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              {issue && <HeaderCriticalToggle issue={issue} />}
              <Tooltip title={variation}>
                <span
                  className="font-medium truncate"
                  style={{ color: 'var(--color-gray-darkest)', maxWidth: 480 }}
                >
                  {variation ?? 'Session replay'}
                </span>
              </Tooltip>
            </div>
            <div className="flex items-center gap-1 lg:gap-2 text-black/50 text-sm">
              {issue && (
                <>
                  <Tooltip title={`Part of issue: ${issue.head}`}>
                    <span className="truncate" style={{ maxWidth: 320 }}>
                      {issue.head}
                    </span>
                  </Tooltip>
                  <span>·</span>
                </>
              )}
              <span className="whitespace-nowrap">{date}</span>
              <span>·</span>
              <Popover
                content={morePopover}
                trigger="hover"
                placement="bottom"
                zIndex={2147483647}
              >
                <span className="link cursor-pointer">More</span>
              </Popover>
            </div>
          </div>

          {/* right cluster — sourced from the session replay subheader:
              Share (copy-at-time), Highlight, overflow, queue controls, tabs */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Popover
              trigger="click"
              placement="bottomRight"
              zIndex={2147483647}
              content={
                <div style={{ width: 248 }}>
                  <SessionCopyLink time={spotPlayerStore.time} />
                </div>
              }
            >
              <Tooltip title="Share session" placement="bottom">
                <Button size="small" icon={<ShareAltOutlined />} />
              </Tooltip>
            </Popover>

            <HighlightButton onClick={() => message.info('Highlight this moment')} />

            <Dropdown
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: 'bookmark',
                    label: (
                      <div className="flex items-center gap-2">
                        {bookmarked ? (
                          <BookmarkCheck size={16} strokeWidth={1.5} />
                        ) : (
                          <Bookmark size={16} strokeWidth={1.5} />
                        )}
                        <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                      </div>
                    ),
                    onClick: toggleBookmark,
                  },
                  {
                    key: 'dl',
                    label: (
                      <div className="flex items-center gap-2">
                        <File size={16} strokeWidth={1.5} />
                        <span>Download video</span>
                      </div>
                    ),
                  },
                ],
              }}
            >
              <Button icon={<MoreOutlined />} size="small" />
            </Dropdown>

            <Divider />

            {/* queue controls — prev / autoplay / next across this issue's sessions */}
            <div className="flex items-center gap-1">
              <Tooltip
                title="Previous session"
                placement="bottom"
                open={prevId ? undefined : false}
              >
                <Button
                  size="small"
                  shape="circle"
                  disabled={!prevId}
                  onClick={() => prevId && goSession(prevId)}
                  icon={<LeftOutlined />}
                />
              </Tooltip>
              <Tooltip title="Toggle autoplay" placement="bottom">
                <Switch
                  className="custom-switch"
                  checked={autoplay}
                  onChange={toggleAutoplay}
                  checkedChildren={<CaretRightOutlined className="switch-icon" />}
                  unCheckedChildren={<PauseOutlined className="switch-icon" />}
                />
              </Tooltip>
              <Tooltip
                title="Next session"
                placement="bottom"
                open={nextId ? undefined : false}
              >
                <Button
                  size="small"
                  shape="circle"
                  disabled={!nextId}
                  onClick={() => nextId && goSession(nextId)}
                  icon={<RightOutlined />}
                />
              </Tooltip>
            </div>

            <Divider />

            <Tabs
              className="w-fit! border-b-0!"
              tabs={[
                {
                  key: 'activity',
                  text: 'Activity',
                  iconComp: (
                    <div className="mr-1">
                      <UserSwitchOutlined />
                    </div>
                  ),
                },
                {
                  key: 'issue',
                  text: 'Issue',
                  iconComp: (
                    <div className="mr-1">
                      <InfoCircleOutlined />
                    </div>
                  ),
                },
              ]}
              active={tab}
              onClick={(k: any) => (k === tab ? setTab(null) : setTab(k))}
            />
          </div>
        </div>
      )}

      {/* body: player column (shrinks) + right sidebar */}
      <div className="flex flex-1 min-h-0 w-full">
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <SpotLocation />
          <div className={cn('w-full min-h-0 flex-1', isFullScreen ? '' : 'relative')}>
            <SpotVideoContainer
              videoURL={sessionVideo}
              checkReady={() => Promise.resolve(true)}
            />
          </div>

          {!isFullScreen && activePanel ? (
            <div
              className="shrink-0 relative overflow-hidden bg-white"
              style={{ height: panelHeight, width: '100%' }}
            >
              <div
                onMouseDown={handleResize}
                className="w-full h-2 cursor-ns-resize absolute top-0 left-0 z-20"
              />
              <div className="w-full h-full bg-white">
                {activePanel === PANELS.CONSOLE && (
                  <SpotConsole onClose={() => spotPlayerStore.setActivePanel(null)} />
                )}
                {activePanel === PANELS.NETWORK && (
                  <SpotNetwork
                    onClose={() => spotPlayerStore.setActivePanel(null)}
                    panelHeight={panelHeight}
                  />
                )}
                {activePanel === PANELS.OVERVIEW && <X_Ray />}
              </div>
            </div>
          ) : null}

          {/* timeline + issue indicators overlaid (player untouched). Sits
              above the blue progress bar (zIndex) so it always reads clearly. */}
          <div className="relative">
            <SpotTimeline />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 40 }}
            >
              {/* issue window — a solid red band over the blue bar */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${(ISSUE_START_S / 61) * 100}%`,
                  width: `${((ISSUE_END_S - ISSUE_START_S) / 61) * 100}%`,
                  background: 'rgba(204,0,0,0.32)',
                }}
              />
              {/* bold tick at the issue moment, with a white halo to lift it
                  off the blue bar */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${(ISSUE_START_S / 61) * 100}%`,
                  width: 3,
                  transform: 'translateX(-50%)',
                  background: 'var(--color-red)',
                  boxShadow: '0 0 0 1.5px rgba(255,255,255,0.85)',
                }}
              />
              {/* prominent marker dot, white ring + shadow */}
              <div
                className="absolute"
                style={{
                  left: `${(ISSUE_START_S / 61) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 16,
                  height: 16,
                  borderRadius: 9999,
                  background: 'var(--color-red)',
                  border: '2.5px solid white',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                }}
              />
            </div>
          </div>
          {isFullScreen ? null : <SpotPlayerControls />}
        </div>

        {/* right sidebar — Activity (real) or Issue (rich AI context) */}
        {!isFullScreen && tab === 'activity' && (
          <div className="shrink-0 min-h-0" style={{ width: SIDEBAR_W }}>
            <IssueActivity onClose={() => setTab(null)} />
          </div>
        )}

        {!isFullScreen && tab === 'issue' && issue && (
          <div
            className="flex flex-col shrink-0 min-h-0 border-l bg-white"
            style={{ width: SIDEBAR_W, borderColor: 'var(--color-gray-light)' }}
          >
            <div
              className="flex items-center justify-between p-3 border-b"
              style={{ borderColor: 'var(--color-gray-light)' }}
            >
              <span className="font-medium text-lg">Issue</span>
              <Button type="text" size="small" onClick={() => setTab(null)}>
                <CloseOutlined />
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-5">
              {/* 1 · the issue — title + one line: category · impact · critical */}
              <div className="flex flex-col gap-2.5">
                <span
                  className="font-semibold"
                  style={{
                    color: 'var(--color-gray-darkest)',
                    fontSize: 17,
                    lineHeight: 1.35,
                  }}
                >
                  {issue.head}
                </span>
                <div
                  className="flex items-center gap-2.5 flex-wrap"
                  style={{ color: 'var(--color-gray-medium)' }}
                >
                  <CategoryLabel cat={issue.cat} />
                  <span style={{ color: 'var(--color-gray-light)' }}>|</span>
                  <span className="inline-flex items-center gap-1.5">
                    <ImpactGauge value={issue.impact} />
                    <span className="text-sm whitespace-nowrap">
                      {impactLevel(issue.impact)} impact
                    </span>
                  </span>
                  <span style={{ color: 'var(--color-gray-light)' }}>|</span>
                  <HeaderCriticalToggle issue={issue} />
                </div>
              </div>

              {/* 2 · this session — its own variation of the issue */}
              {(card?.variation ||
                card?.journey ||
                (card?.tags?.length ?? 0) > 0 ||
                card?.plan) && (
                <div className="flex flex-col gap-3">
                  <span
                    className="text-xs font-semibold uppercase"
                    style={{
                      color: 'var(--color-gray-medium)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    This session
                  </span>
                  {card?.variation && (
                    <span
                      className="font-medium"
                      style={{
                        color: 'var(--color-gray-darkest)',
                        fontSize: 15,
                        lineHeight: 1.4,
                      }}
                    >
                      {card.variation}
                    </span>
                  )}
                  {/* tags lead — the behavioural signals of this session */}
                  {(card?.tags?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {card!.tags.map((t) => (
                        <TagChip key={t} label={t} />
                      ))}
                    </div>
                  )}
                  {card?.journey && (
                    <span
                      style={{
                        color: 'var(--color-gray-dark)',
                        fontSize: 15,
                        lineHeight: 1.6,
                      }}
                    >
                      {card.journey}
                    </span>
                  )}
                  {card?.plan && (
                    <SessionMetaList
                      horizontal
                      maxLength={3}
                      metaList={[{ label: 'plan', value: card.plan }]}
                    />
                  )}
                </div>
              )}

              {/* 3 · the problem and the suggested fix, combined as tabs */}
              <ProblemResolutionTabs issue={issue} />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(
    <ConfigProvider theme={{ token: { zIndexPopupBase: 2147483000 } }}>
      {content}
    </ConfigProvider>,
    document.body,
  );
}

export default observer(IssueSessionPlayer);

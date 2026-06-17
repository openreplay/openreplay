import cn from 'classnames';
import { createPortal } from 'react-dom';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import {
  CopyOutlined,
  MoreOutlined,
  WarningFilled,
  CloseOutlined,
  UserSwitchOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import Tabs from 'Components/Session/Tabs';
import Event from 'Components/Session_/EventsBlock/Event';
import { TYPES } from 'Types/session/event';
import { Button, ConfigProvider, Dropdown, Popover, Tooltip, message } from 'antd';
import copy from 'copy-to-clipboard';

import { useStore } from 'App/mstore';
import { useHistory, useParams } from 'App/routing';
import {
  withSiteId,
  issues as issuesRoute,
  issue as issueDetailRoute,
} from 'App/routes';
import { Avatar, CountryFlag, EscapeButton, Icon } from 'UI';
import { hashString } from 'App/types/session/session';
import { capitalize } from 'App/utils';
import { countries } from 'App/constants';
import { browserIcon, osIcon, deviceTypeIcon } from 'App/iconNames';
import SessionInfoItem from 'Components/Session_/SessionInfoItem';
import {
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
import SpotActivity from 'Components/Spots/SpotPlayer/components/SpotActivity';
import SpotLocation from 'Components/Spots/SpotPlayer/components/SpotLocation';
import SpotPlayerControls from 'Components/Spots/SpotPlayer/components/SpotPlayerControls';
import SpotTimeline from 'Components/Spots/SpotPlayer/components/SpotTimeline';
import SpotVideoContainer from 'Components/Spots/SpotPlayer/components/SpotVideoContainer';
import spotPlayerStore, {
  PANELS,
} from 'Components/Spots/SpotPlayer/spotPlayerStore';

import { getMockSessionById } from 'App/dev/mockSessions';
import ProblemCard, { AiSummary, CategoryLabel } from './ProblemCard';
import sessionVideo from './sessionVideo';
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

/* Activity list — a 1:1 copy of SpotActivity (same Event rows + current-event
   bar) plus a subtle gradient left bar marking the activities that happened
   during the issue. Replicated (not the shared component) only so we can add
   the indicator without touching the player. */
const IssueActivity = observer(({ onClose }: { onClose: () => void }) => {
  const mixedEvents = React.useMemo(() => {
    const result = [...spotPlayerStore.locations, ...spotPlayerStore.clicks];
    return result.sort((a, b) => a.time - b.time);
  }, [spotPlayerStore.locations, spotPlayerStore.clicks]);
  const { index } = spotPlayerStore.getHighlightedEvent(
    spotPlayerStore.time,
    mixedEvents,
  );
  const jump = (time: number) => spotPlayerStore.setTime(time / 1000);
  const shadow = (i: number) =>
    i < index ? '#A7BFFF' : i === index ? '#394EFF' : 'transparent';
  const inIssue = (t: number) =>
    t >= ISSUE_START_S * 1000 && t <= ISSUE_END_S * 1000;

  return (
    <div
      className="h-full bg-white border-l"
      style={{ minWidth: 320, width: 320, borderColor: 'var(--color-gray-light)' }}
    >
      <div className="flex items-center justify-between p-4">
        <div className="font-medium text-lg">Activity</div>
        <Button type="text" size="small" onClick={onClose}>
          <CloseOutlined />
        </Button>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 128px)' }}>
        {mixedEvents.map((event, i) => (
          <div key={event.time} onClick={() => jump(event.time)} className="relative">
            {/* issue-window gradient bar */}
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
            {/* current/past progress bar (as in SpotActivity) */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 1.5,
                height: '100%',
                backgroundColor: shadow(i),
                zIndex: 98,
              }}
            />
            {i === index ? (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: -10,
                  width: 10,
                  height: 10,
                  transform: 'rotate(45deg) translate(0, -50%)',
                  background: '#394EFF',
                  zIndex: 99,
                  borderRadius: '.15rem',
                }}
              />
            ) : null}
            {'label' in event ? (
              <Event
                whiteBg
                event={{ type: TYPES.CLICK, label: (event as any).label, count: 1 } as any}
                isCurrent={i === index}
              />
            ) : (
              <Event
                showLoadInfo
                whiteBg
                event={{ ...event, type: TYPES.LOCATION, url: (event as any).location } as any}
                isCurrent={i === index}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

function TagChip({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-2 rounded border whitespace-nowrap"
      style={{
        borderColor: 'var(--color-gray-light)',
        background: 'white',
        color: 'var(--color-gray-medium)',
        lineHeight: '20px',
      }}
    >
      {label}
    </span>
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
  const onCopy = () => {
    copy(window.location.href);
    message.success('Link copied to clipboard');
  };
  const { isFullScreen, activePanel } = spotPlayerStore;
  const Divider = () => (
    <div className="h-6 border-l mx-1" style={{ borderColor: 'var(--color-gray-light)' }} />
  );

  const morePopover = (
    <div className="text-left bg-white">
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
          <Button type="text" size="small" icon={<ArrowLeft size={15} />} onClick={back} className="px-2">
            Back to issue
          </Button>
          <Divider />
          <Avatar seed={hashString(email)} />
          <div className="leading-tight min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              {issue?.critical && (
                <Tooltip title="Critical">
                  <WarningFilled style={{ color: 'var(--color-red)', fontSize: 15 }} />
                </Tooltip>
              )}
              <Tooltip title={issue?.head}>
                <span
                  className="font-medium truncate"
                  style={{ color: 'var(--color-gray-darkest)', maxWidth: 460 }}
                >
                  {issue?.head ?? 'Session replay'}
                </span>
              </Tooltip>
              {issue && <CategoryLabel cat={issue.cat} />}
            </div>
            <div className="flex items-center gap-1 lg:gap-2 text-black/50 text-sm">
              <span className="color-teal">{email}</span>
              <span>·</span>
              <span className="whitespace-nowrap">{date}</span>
              <span>·</span>
              <span className="whitespace-nowrap">Chromium v144.0.0</span>
              <span>·</span>
              <span>1440x900</span>
              <span>·</span>
              <span className="capitalize whitespace-nowrap">{capitalize(os)}</span>
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
          <div className="ml-auto" />
          <Button size="small" onClick={onCopy} icon={<CopyOutlined />}>
            Copy
          </Button>
          <Dropdown
            menu={{ items: [{ key: 'dl', label: 'Download video' }] }}
            placement="bottomRight"
          >
            <Button icon={<MoreOutlined />} size="small" />
          </Dropdown>
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

          {/* timeline + issue indicators overlaid (player untouched) */}
          <div className="relative">
            <SpotTimeline />
            <div className="pointer-events-none absolute inset-0">
              {/* faint band: the issue spans several seconds */}
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${(ISSUE_START_S / 61) * 100}%`,
                  width: `${((ISSUE_END_S - ISSUE_START_S) / 61) * 100}%`,
                  background:
                    'linear-gradient(90deg, rgba(204,0,0,0.05), rgba(204,0,0,0.18), rgba(204,0,0,0.05))',
                }}
              />
              {/* issue marker dot */}
              <div
                className="absolute"
                style={{
                  left: `${(ISSUE_START_S / 61) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 10,
                  height: 10,
                  borderRadius: 9999,
                  background: 'var(--color-red)',
                  border: '2px solid white',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.08)',
                }}
              />
            </div>
          </div>
          {isFullScreen ? null : <SpotPlayerControls />}
        </div>

        {/* right sidebar — Activity (real) or Issue (rich AI context) */}
        {!isFullScreen && tab === 'activity' && (
          <div className="flex flex-col shrink-0 min-h-0" style={{ width: SIDEBAR_W }}>
            <button
              onClick={() => setTab('issue')}
              className="text-left border-l border-b bg-white px-3 py-2.5 flex items-start gap-2"
              style={{ borderColor: 'var(--color-gray-light)' }}
            >
              <Icon name="sparkles" size={15} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-main">AI detected this issue</div>
                <div className="text-xs truncate" style={{ color: 'var(--color-gray-dark)' }}>
                  {issue?.head ?? 'Issue'}
                </div>
              </div>
              <ChevronRight size={15} style={{ color: 'var(--color-gray-medium)', flexShrink: 0, marginTop: 2 }} />
            </button>
            <div className="flex-1 min-h-0 overflow-hidden">
              <IssueActivity onClose={() => setTab(null)} />
            </div>
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
            <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-4">
              <ProblemCard issue={issue} />
              {(card?.journey || (card?.tags?.length ?? 0) > 0) && (
                <div className="flex flex-col gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--color-gray-dark)' }}
                  >
                    This session
                  </span>
                  {card?.journey && (
                    <AiSummary variant="secondary">{card.journey}</AiSummary>
                  )}
                  {(card?.tags?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {card!.tags.map((t) => (
                        <TagChip key={t} label={t} />
                      ))}
                    </div>
                  )}
                </div>
              )}
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
